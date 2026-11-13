# Panduan deploy dua proyek Vercel

Status 13 November 2026: row51 dibatasi PM ke persiapan rilis lokal. Belum menjalankan deploy, migrasi cloud, perubahan environment, cron atau smoke test produksi. URL produksi belum diverifikasi pada pekerjaan ini. [Checklist rilis](release-checklist.md) mencatat hasil lokal dan gerbang layanan/freeze; target/lingkungan perlu ditetapkan sebelum tindakan layanan.

## Target dan versi

Gunakan commit yang ditinjau dan lulus CI dari [repo proyek](https://github.com/Ammartriwahyu/TikumGriyashanta). Catat pemilik/team Vercel, proyek Supabase, branch/commit serta lingkungan Preview/Production sebelum mengubah layanan.

| Proyek | Root Directory | Framework | Build/entry |
|---|---|---|---|
| Frontend | frontend | Next.js | Build Command `pnpm run build`, output default Next.js |
| Backend | backend | Hono | Default export app pada src/index.ts; jangan menjalankan server localhost |

Pada kedua proyek pilih Node **24.x**, sesuai CI. Pertahankan **Include files outside the root directory in the Build Step** agar lockfile/workspace akar terbaca ([Vercel root directory](https://vercel.com/docs/builds/configure-a-build)).

**Manifest akar, frontend dan backend sudah mem-pin `engines.node` ke `24.x` pada row51.** Cocokkan dengan dashboard serta log build. Rentang luas dapat memilih mayor lebih baru meskipun dashboard memilih 24.x; [engines dapat mengalahkan dashboard](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Konfigurasi cloud belum diubah.

Tambahkan `ENABLE_EXPERIMENTAL_COREPACK=1` pada kedua proyek. Package manager adalah **pnpm@12.16.1** dari manifest akar. Install Command eksplisit dari masing-masing Root Directory:

```bash
cd .. && corepack pnpm install --frozen-lockfile
```

Build frontend dijalankan dari frontend. Backend memakai builder Hono; jangan mengisi `pnpm dev` atau src/local-server.ts sebagai entry. Rujukan: [konfigurasi build](https://vercel.com/docs/builds/configure-a-build), [package managers](https://vercel.com/docs/package-managers). Cocokkan Node/pnpm pada log sebelum promosi. Pengaturan cloud ini belum diuji pada akun proyek.

## Environment dan layanan

Isi melalui Project Settings → Environment Variables pada lingkungan yang tepat. Gunakan secret untuk kunci server. URL contoh berikut bukan deployment yang sudah tersedia.

| Proyek | Nama | Isi |
|---|---|---|
| Backend | FRONTEND_ORIGIN | Origin frontend resmi, misalnya https://frontend-tim.vercel.app, tanpa path/garis miring akhir |
| Backend | SUPABASE_URL | Proyek Supabase yang disetujui dan dimigrasikan |
| Backend | SUPABASE_SECRET_KEY | Secret, hanya backend |
| Backend | GEMINI_API_KEY | Secret milik tim, pemilik ≥18 tahun diverifikasi tim |
| Backend | GEMINI_MODEL | Model yang tersedia bagi kunci |
| Backend | AI_DAILY_LIMIT | Jatah harian per rumah tangga sesuai kuota; bawaan kode 20 |
| Backend | SCAN_TOKEN_SECRET | Secret acak minimal 32 karakter |
| Frontend | NEXT_PUBLIC_API_URL | URL backend tanpa path /v1; aplikasi menambahkan path API |
| Frontend | NEXT_PUBLIC_SUPABASE_URL | Proyek yang sama dengan backend |
| Frontend | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key, bukan secret key |
| Frontend | NEXT_PUBLIC_DEMO_EMAIL, NEXT_PUBLIC_DEMO_PASSWORD | Opsional, kosong sampai demo publik disiapkan |

NODE_ENV produksi disediakan platform; jangan salin development dari contoh lokal. PORT hanya untuk localhost. DEMO_EMAIL/PASSWORD backend dipakai skrip seed operator, bukan proses API cloud. Cron/VAPID tidak diperlukan karena P14 dilewati. Jangan memasukkan nilai kunci/sandi ke repo, log atau dokumen ini.

NEXT_PUBLIC_* diikat saat build; perubahan URL/key/demo membutuhkan build/deploy baru ([Next.js environment](https://nextjs.org/docs/app/guides/environment-variables)). Pisahkan layanan/kredensial Preview dan Production sesuai kebijakan tim.

Terapkan lima migrasi dan siapkan seed pada target yang disetujui mengikuti [panduan lokal](local-development.md#3-siapkan-database-dan-auth-sekali). Periksa RLS/RPC, lalu `pnpm --filter backend db:check-rls` dari konfigurasi publik target. Seed memulihkan/menghapus data demo, jadi targetnya harus dipilih dahulu.

Site URL Supabase Auth menunjuk frontend resmi. Tambahkan URL kembali yang dipakai; produksi memakai URL spesifik, bukan wildcard semua domain ([Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)). Aplikasi memakai email/kata sandi; sesudah konfirmasi email pengguna masuk lagi secara manual.

## Urutan penyambungan

1. Tentukan dua proyek/domain dan commit kandidat. Pembuatan/perubahan cloud dilakukan operator setelah target disetujui.
2. Lengkapi database dan environment backend, deploy backend, periksa GET /v1/health: 200 `{"status":"ok"}` saat database terbaca, 503 bila belum siap.
3. Isi environment frontend dengan backend dan Supabase tersebut, lalu deploy frontend.
4. Cocokkan FRONTEND_ORIGIN dengan origin frontend; deploy ulang backend jika berubah. CORS tidak otomatis menerima semua URL preview.
5. Uji pasangan Preview yang cocok memakai data fiktif dan [checklist manual](manual-test-checklist.md). Catat URL/commit/waktu/hasil sebelum promosi Production.

Preview dengan autentikasi Vercel dapat menghalangi API lintas proyek. Akses dan perlindungan deployment perlu disesuaikan oleh operator pada target yang disetujui; jangan membagikan bypass token melalui frontend.

## Smoke test ketika target tersedia

| Langkah | Hasil yang perlu dibuktikan |
|---|---|
| Health | Database terbaca, HTTP 200 |
| Login demo | Akun publik telah dibuat dan penanda demo tampil |
| Tambah obat fiktif | Pratinjau AI tidak menyimpan sebelum konfirmasi; simpan/fallback sah |
| Scan kemasan | Persetujuan, kemasan aman, cocok/kekuatan berbeda/gagal tertangani |
| Konfirmasi | Scan tidak mencatat sendiri; POST tindakan pengguna menghasilkan level/hitungan benar |
| Hapus akun uji | Hanya akun disposable yang disetujui; pengguna Auth/enam tabel terhapus, akun lain utuh; demo ditolak |
| Perangkat/layanan | Kamera, suara lokal, sesi dua HP dan Supabase/Gemini nyata |

Tabel adalah prosedur, **belum hasil lulus**. Catat hasil pada [checklist rilis](release-checklist.md); batas bukti: [P15](review-report.md), [matriks AC](ac-traceability.md).

## Cron dan keberlanjutan demo

Tidak ada /v1/internal/reminders/run, manifest PWA atau API push pada MVP ini. Jangan menjadwalkan endpoint tersebut. GET /v1/health publik membaca database; [rencana pemantauan harian](release-checklist.md#pemantauan-harian-yang-belum-diaktifkan) menunggu target serta persetujuan operator. Health tidak menjamin paket gratis tidak dipause; periksa status/kuota layanan sebelum demo. Row50/51 tidak membuat jadwal cron atau mengubah project settings.

Cadangan seed/migrasi dan prosedur pemulihan/rekaman tersedia di [runbook demo](demo-runbook.md). Perintah tag freeze hanya dijalankan setelah [gerbang rilis](release-checklist.md#gerbang-sebelum-tag-freeze) terpenuhi. Rekaman, pemulihan pada layanan dan smoke aktual belum dikerjakan; enam AC yang belum lengkap tetap terbuka.
