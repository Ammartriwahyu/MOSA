# Hasil uji klon bersih lokal

13 November 2026 · Windows/PowerShell · Node 24.15.0 · pnpm 12.16.1.

**Instalasi, pemeriksaan kode, build dan proses awal berhasil. Demo dengan layanan nyata belum diverifikasi.** Tidak ada deploy, migrasi cloud atau seed akun pada pengujian ini.

## Sumber dan isolasi

- Klon Git lokal baru dengan `--no-hardlinks --single-branch --branch docs/readme-release`; bukan pengujian unduh dari GitHub. Akses remote belum dibuktikan.
- HEAD sumber: `03dce21a01b0a65ea05ddf60ef7ef7df41eed167` (hasil P15). Sebelum instalasi, tidak ada node_modules maupun konfigurasi .env pada akar/kedua paket.
- Lima perubahan belum di-commit disalin secara eksplisit sebagai overlay: README.md, docs/local-development.md, docs/deploy.md, backend/.env.example dan frontend/.env.example. Tidak ada perubahan kode aplikasi, manifest atau lockfile pada pekerjaan ini. Laporan ini ditambahkan setelah pengujian.
- Tidak membaca atau menyalin .env dari workspace asal. Contoh konfigurasi disalin memakai langkah README yang tidak menimpa berkas yang sudah ada.
- Setelah pemeriksaan konfigurasi kosong, hanya klon uji diberi nilai fiktif: URL Supabase menuju loopback tanpa layanan pada port 1, key/model/rahasia khusus fixture, serta kredensial demo kosong. Tidak ada respons layanan palsu pada aplikasi; kegagalan koneksi benar-benar diteruskan.

Instalasi memakai cache paket yang tersedia, jadi waktunya bukan ukuran unduh pertama pada perangkat baru. Klon berada di bawah cache repo asal; Next.js memperingatkan workspace di direktori induk diabaikan karena di luar batas Git klon. Proses tetap berhasil dan tidak ada konfigurasi aplikasi yang dilonggarkan.

## Hasil yang diamati

| Langkah | Hasil | Waktu |
|---|---|---|
| `pnpm install --frozen-lockfile` | Lulus; 558 paket, tidak mengubah lockfile | 37,4 dtk menurut pnpm |
| Salin dua contoh konfigurasi | Lulus; berkas baru hanya pada klon | Tidak diukur |
| Memuat backend dengan contoh yang belum diisi | Ditolak sesuai harapan, exit 1; hanya nama SUPABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL dan SCAN_TOKEN_SECRET pada pesan validasi | Tidak dijadikan tolok ukur |
| `pnpm dev` dengan konfigurasi fiktif | Kedua proses mulai; Next.js melaporkan Ready | Ready 1,653 dtk, belum termasuk kompilasi halaman |
| GET /login | HTTP 200, dokumen HTML; belum membuktikan interaksi atau sesi browser | 7,036 dtk satu permintaan awal |
| GET /v1/health | HTTP 503 dengan kode DATABASE_UNAVAILABLE, sesuai layanan database yang tidak tersedia; bukan health sukses | 5,109 dtk satu permintaan |
| `pnpm typecheck` | Lulus pada kedua paket | 12,51 dtk |
| `pnpm lint` | Lulus; 48 probe batas impor (34 backend, 14 frontend) | 36,71 dtk |
| `pnpm test` | Lulus: 677 backend/44 berkas dan 559 frontend/49 berkas, termasuk 11 HTTP E2E | 79,14 dtk keseluruhan |
| `pnpm --filter frontend build` | Lulus dengan konfigurasi publik fiktif; bukan build yang siap menunjuk layanan produksi | 24,94 dtk |

Pemeriksaan tipe, lint, suite penuh dan build dijalankan berurutan satu kali; server dev dihentikan sebelum pemeriksaan kode. Durasi selain catatan pnpm/Ready diukur dari perintah atau permintaan pada mesin ini, bukan target kinerja. HTTP E2E memakai SQL memori dan transport Auth/PostgREST/AI uji, bukan bukti layanan eksternal.

Pemeriksaan dokumentasi akhir: 29 tautan lokal beserta tiga anchor valid, 11 blok PowerShell lolos pemeriksaan sintaks, dan `git diff --check` tidak menemukan galat spasi. Ini tidak membuktikan perintah deploy telah dijalankan.

## Perbaikan panduan dari pengujian

1. Menyalin .env.example saja tidak cukup. [README](../README.md) mewajibkan mengisi konfigurasi dan menyiapkan lima migrasi/RLS sebelum menjalankan aplikasi.
2. Instalasi/provisioning/kompilasi pertama dibedakan dari startup harian. Tidak ada klaim penyiapan dari nol dalam satu menit.
3. Health 503 dan proses yang sudah listen tidak disebut demo siap. Backend harus mendapat health 200 setelah database benar-benar terhubung.
4. Akun Demo Juri publik belum ditetapkan. [Panduan lokal](local-development.md#5-menyiapkan-akun-demo-juri) berisi langkah penyiapan; tombol hanya tampil jika email dan sandi publik demo terisi.
5. Contoh environment hanya memuat konfigurasi yang dipakai. Cron/VAPID yang belum dibangun tidak lagi diminta.

## Verifikasi lanjutan pada target yang disetujui

Ulangi langkah [panduan lokal](local-development.md) pada clone dari branch/commit yang sudah dipublikasikan, isi konfigurasi perangkat sendiri dan siapkan layanan. Harus dibuktikan: health 200, seed dan login demo, consent, tambah/edit obat, AI/scan, konfirmasi dan penghapusan akun uji sesuai [checklist manual](manual-test-checklist.md). Jangan menganggap hasil HTTP 200 halaman sebagai bukti alur tersebut.

Docker tidak tersedia pada mesin ini, sehingga opsi Supabase lokal belum dijalankan ulang. Supabase Auth/GoTrue/JWT/PostgREST nyata, Gemini, kamera/suara, perangkat Android/iOS dan produksi belum diuji pada row50. Tidak ada kredensial publik baru, cron atau tag freeze yang dibuat. Langkah deploy/rilis berikutnya tersedia di [panduan deploy](deploy.md); [enam AC yang belum lengkap](ac-traceability.md) tetap terbuka.
