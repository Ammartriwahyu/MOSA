# Laporan tinjauan P15

Tanggal: 13 November 2026. Branch terakhir: `chore/architecture-cleanup`, di atas `fix/a11y-audit` dan `fix/security-privacy-audit`.

P15 mencakup keamanan/privasi/AI (row47), aksesibilitas (row48), serta arsitektur dan pengukuran lokal (row49). Temuan tinggi yang terkonfirmasi dalam cakupan kode ini telah diperbaiki. Bukti layanan, perangkat dan kriteria penerimaan yang belum lengkap tetap menjadi pekerjaan rilis; laporan ini tidak menyatakan seluruh MVP siap dirilis.

## Lima temuan utama

| ID / tingkat sebelum perbaikan | Temuan | Penyelesaian |
|---|---|---|
| P15-01 / Tinggi | Cache rumah tangga dipakai kembali saat berganti akun; respons lama dapat mengeluarkan akun baru. Kelanjutan hapus akun juga masih berjalan setelah layar dilepas. | Row47: QueryClient/observer dipisahkan per akun, callback global dibatasi ke klien aktif, proses hapus dibatalkan saat unmount dan signal diteruskan sampai pemeriksaan sebelum fetch. Tes reproduksi mendahului perbaikan. [Bukti S01](security-privacy-audit.md). |
| P15-02 / Tinggi | Keluaran AI dapat mengganti frekuensi menjadi takaran, menghilangkan larangan, atau mengikuti instruksi di catatan. | Row47: pagar pasangan angka–satuan, topik negasi dan pola pengambilalihan; explain dan simpan menolak contoh adversarial. Pagar adalah heuristik, pemeriksaan manusia tetap wajib. [Bukti S02](security-privacy-audit.md). |
| P15-03 / Tinggi | Pembesaran teks tidak diikuti token piksel; saat teks diperbesar, kontrol/panel foto terpotong dan navigasi keluar layar. | Row48: rem, tinggi minimum, penataan ulang berbasis ukuran teks, ruang navigasi dan panel foto adaptif. Pemulihan fokus, indikator fokus dan kontras juga diperbaiki. 40 pemeriksaan axe tanpa violation; 120 kombinasi tata letak lulus. Gradasi diperiksa terpisah dari axe. [Laporan aksesibilitas](a11y-audit.md). |
| P15-04 / Sedang | Metadata permintaan dapat menyalurkan isi klien ke log, JSON umum tidak dibatasi sebelum parse, dan kebijakan cache data belum seragam. | Row47: UUID server, allowlist metode log, stream JSON 32 KiB, UTF-8 ketat, serta no-store/nosniff/no-referrer seluruh respons. [Bukti S03–S05](security-privacy-audit.md). |
| P15-05 / Sedang | Aturan batas lapisan/fitur belum melarang impor langsung antara dua paket frontend/backend. Ada registrasi use case HTTP tanpa consumer. | Row49: no-restricted-imports menolak kedua arah, termasuk type-only; probe membuktikan empat kasus lolos sebelum perbaikan lalu ditolak. Registrasi GetNextDose yang tidak dipanggil dihapus dari container produk dan dua fixture. Rute tetap memakai algoritme jadwal berikutnya melalui ListTodaysDoses/GetScanContext. |

## Audit arsitektur dan kode tak terpakai

- [Aturan backend](../backend/eslint.config.mjs) mempertahankan domain murni, application hanya domain/port, interface tidak mengimpor infrastructure, dan batas antarmodul. [Aturan frontend](../frontend/eslint.config.mjs) mempertahankan pintu keluar fitur melalui index.ts serta larangan shared → features. Larangan lint yang sudah ada tidak dilonggarkan.
- [check-architecture.mjs](../scripts/check-architecture.mjs) menjalankan **48 probe: 34 impor terlarang dan 14 impor sah**, masing-masing mencakup nilai dan type-only. Backend 34/34, frontend 14/14. Target probe harus dapat di-resolve dan path sumber harus ada. Parser error, path diabaikan atau galat lain tidak dihitung sebagai penolakan arsitektur yang benar.
- Probe memakai [API ESLint lintText/filePath](https://eslint.org/docs/latest/integrate/nodejs-api) dengan konfigurasi asli, tanpa menulis impor salah ke src. Setiap paket memakai proses sendiri agar cache resolver tsconfig terisolasi. `pnpm lint` akar kini juga menjalankan `pnpm architecture:check`, sehingga langkah lint CI yang sudah ada mencakup probe ini.
- Pemeriksaan AST pada **97 berkas backend + 128 frontend** runtime TS/TSX menemukan **0 AnyKeyword**, **0 @ts-ignore/@ts-nocheck**, dan **0 impor frontend ke backend, Gemini, PGlite, Vitest atau axe-core**. Tes, folder testing dan katalog dev dikecualikan dari hitungan runtime. Pencarian teks `any` awal hanya mengenai AbortSignal.any; itu bukan tipe any.
- `tsc --noEmit --noUnusedLocals --noUnusedParameters` kedua paket lulus. [Container produk](../backend/src/composition-root.ts), [fixture unit/HTTP](../backend/tests/support/test-container.ts), dan [fixture E2E](../backend/tests/support/e2e-system.ts) tidak lagi merakit getNextDose yang tidak dikonsumsi rute. Use case GetNextDose tetap tersedia sesuai dokumen desain beserta tujuh tesnya; fungsi domain findNextDose tetap dipakai jalur jadwal/scan.
- Satu pengecualian lint yang ditinjau: img lokal pada [scan-capture-view.tsx](../frontend/src/features/scan/components/scan-capture-view.tsx). Alasannya tetap menjaga foto dari optimasi/proxy Next Image. Tidak ada pengecualian batas lapisan/fitur baru. API UI publik, berkas konvensi Next dan utilitas uji tidak dihapus berdasarkan dugaan bahwa ekspornya jarang dipakai.

Audit AST adalah pencarian pola dan pemeriksaan tipe, bukan pembuktian bahwa seluruh kemungkinan kode mati atau impor dinamis dapat ditemukan. Tidak ditemukan impor terlarang pada sumber runtime yang diperiksa. Tidak ada perubahan aturan dosis, DTO API, migrasi, copy UI atau DRAFT pada row49.

## Pengukuran frontend

Mesin: Windows, Node **24.15.0**, 16 logical CPU, sekitar 12 GiB RAM. Build memakai Next **16.4.6/Turbopack**, konfigurasi publik fiktif dengan alamat loopback serta kredensial demo kosong. Tidak membaca isi `.env` atau memakai data akun nyata.

`pnpm --filter frontend build` lulus: kompilasi 7,1 detik, tahap TypeScript 8,8 detik dan tahap prarender (penghitung build 13/13) 781 ms. Angka fase tersebut berasal dari keluaran build, bukan pengukuran total waktu build. Rute dinamis tetap dibentuk sesuai kontrak App Router; katalog dev tetap memakai penolakan produksi.

Next 16 menghapus metrik ukuran JS dari keluaran build ([referensi CLI](https://nextjs.org/docs/app/api-reference/cli/next)). [measure-home-bundle.mjs](../frontend/scripts/measure-home-bundle.mjs) menjalankan server produksi localhost sementara, mengambil HTML `/`, lalu menghitung URL script/CSS unik yang dinyatakan HTML. JSDOM hanya mem-parse HTML tanpa menjalankan script atau memuat resource otomatis. Permintaan aset dibatasi ke origin lokal dan `/_next/static/`; tidak menelusuri direktori build.

| Aset halaman utama | Berkas | Byte tanpa kompresi | Estimasi gzip |
|---|---:|---:|---:|
| JavaScript modern awal | 11 | 1.008.673 | 293.085 (≈286,2 KiB) |
| JavaScript nomodule, dilaporkan terpisah | 1 | 112.594 | 39.627 |
| CSS awal | 1 | 31.910 | 6.897 |

Gzip dihitung per berkas lalu dijumlahkan; bukan byte transfer aktual suatu deployment. Angka tidak mencakup lazy chunks, font, HTML, payload RSC, cache browser atau seluruh interaksi sesudah login. Waktu proses server frontend sampai HTML pertama pada run pengukuran **1.198,90 ms**, satu sampel lokal. Ini bukan LCP, waktu interaktif perangkat atau cold start platform hosting. Ulangi dengan konfigurasi rilis untuk ukuran rilisnya.

## Latensi API dan cold entry backend

[benchmark-local.ts](../backend/tests/performance/benchmark-local.ts) memakai fixture HTTP E2E yang sudah ada: Hono benar-benar listen di loopback, SDK/adaptor Supabase dan SQL/RPC/migrasi asli berjalan pada PGlite memori. **Auth/PostgREST dan port AI adalah tiruan**, SQL satu koneksi. Tidak ada panggilan Gemini, penulisan database luar, atau foto nyata.

Fixture: satu rumah tangga, satu obat fiktif, dua jadwal. Tiap rute menjalani **5 warmup + 30 sampel serial**. Durasi dimulai sebelum fetch dan berakhir setelah JSON dibaca. Untuk konfirmasi, tiap sampel memakai slot pada hari fiktif berbeda dan memerlukan HTTP 201, sehingga tidak mengukur replay 409. P50/P95 memakai nearest-rank; [enam tes statistik](../backend/tests/performance/measurements.test.ts) mencakup urutan sampel, pembulatan, satu sampel dan penolakan nilai tidak sah.

| Rute | Status | N diukur | P50 (ms) | P95 (ms) | Maks (ms) |
|---|---:|---:|---:|---:|---:|
| GET /v1/health | 200 | 30 | 2,78 | 5,15 | 5,18 |
| GET /v1/medicines | 200 | 30 | 4,96 | 7,48 | 7,86 |
| GET /v1/doses/today | 200 | 30 | 5,31 | 8,91 | 9,09 |
| POST /v1/doses/:slotId/confirm, basic | 201 | 30 | 8,08 | 12,44 | 14,60 |

Cold entry diperiksa di **lima proses Node baru**. Environment proses hanya memuat kebutuhan sistem serta konfigurasi layanan fiktif; mode ini mengimpor `src/index.ts` dan merakit container tanpa mengirim HTTP ke layanan:

| Bagian | Min (ms) | P50 (ms) | Maks (ms) |
|---|---:|---:|---:|
| Impor entry + konstruksi container | 1.117,01 | 1.159,64 | 2.018,64 |
| Spawn sampai proses probe selesai | 1.316,25 | 1.366,77 | 2.380,37 |

Angka cold entry mencakup pemuatan/transpilasi TSX dan dependency pada mesin ini; cache OS/transform tidak dikosongkan dan mesin/VM baru tidak dibuat. Penyiapan fixture PGlite terpisah membutuhkan 3.242,14 ms dan bukan biaya startup produk. Tidak ada perbandingan sebelum/sesudah yang membuktikan percepatan akibat cleanup.

Angka API lokal **belum membuktikan** latensi Auth/PostgREST/JWT/Supabase, AI, jaringan, konkurensi produksi atau cold start Vercel. Beban satu obat bukan pengujian kapasitas. Tidak memasang ambang waktu benchmark ke CI; hasil bergantung pada mesin dan beban. Server serta database sementara ditutup sebelum hasil sukses diterbitkan.

## Menjalankan ulang

```bash
pnpm architecture:check
pnpm --filter backend bench:local
pnpm --filter frontend build
pnpm --filter frontend bench:bundle
pnpm typecheck
pnpm lint
pnpm test
```

`bench:local` tidak memuat `.env` dan memakai data fiktif sendiri. `bench:bundle` memerlukan build sebelumnya; build mengikuti konfigurasi publik proyek. Kedua alat tidak mencetak kredensial, input obat, token atau isi respons, hanya statistik dan metadata pengukuran. Tidak ada dependency baru. Log angka run branch tersimpan lokal pada `.claude/cache/row49-*.txt`, di-ignore.

## Verifikasi dan pekerjaan rilis yang tersisa

Tes terarah cleanup/E2E/statistik: **24 lulus**, dan enam tes statistik diulang setelah perbaikan tipe tabel fixture. TypeScript dengan pemeriksaan unused kedua paket lulus. Pemeriksaan akhir berurutan **pnpm typecheck, pnpm lint, pnpm test lulus**: lint mencakup 48 probe; **677 backend pada 44 berkas (42,17 detik) + 559 frontend pada 49 berkas (59,89 detik)**, termasuk 11 HTTP E2E. Bertambah enam tes statistik backend dari row48. Seluruh 18 tautan lokal laporan valid dan `git diff --check` bersih. Worker, timeout dan retry tes tetap sama.

| Bukti/pekerjaan | Status |
|---|---|
| Keamanan/privasi/AI terarah | Perbaikan dan batas bukti pada [laporan row47](security-privacy-audit.md); pemindaian rahasia/advisori adalah snapshot row47, tidak diklaim sebagai audit ulang semua layanan pada row49. |
| Aksesibilitas desktop | [Laporan row48](a11y-audit.md), 40 axe tanpa violation dan 120 kombinasi; pembaca layar/zoom native/perangkat nyata belum. |
| AC | [Matriks AC](ac-traceability.md) tetap **20 Lulus otomatis, 6 Belum lengkap, 0 Gagal**. AC-01/02/05/09/16/26 tetap membutuhkan bukti; khusus AC-09 belum ada assertion exact verified 1/2→2/2. |
| Perangkat/layanan | [Checklist manual](manual-test-checklist.md) tetap Belum pada Android/iOS; sesi dua HP, demo rilis, kamera, suara dan keterbacaan pengguna perlu diuji. GoTrue/JWT/PostgREST nyata, pencabutan sesi, race dua koneksi dan Gemini nyata belum terbukti oleh fixture. |
| Proses/konfigurasi | Kepemilikan kunci AI ≥18 tahun, retensi penyedia, log infrastruktur, traffic/rate policy hosting serta konfigurasi deployment perlu pemeriksaan tim/lingkungan rilis. |
| Tahap berikutnya | P14 notifikasi/PWA/push tetap dilewati sesuai gerbang MVP stabil yang belum terbukti. P16 row50–51 melanjutkan README/deploy, klon bersih, smoke test dan persiapan rilis sesuai urutan. |

Tidak ada temuan kode tinggi terkonfirmasi yang sengaja ditunda. Kekurangan bukti di tabel tetap terbuka; hasil unit/fixture/build lokal tidak menggantikannya.
