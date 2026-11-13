# Menyiapkan dan menjalankan MOSA

Perintah dari akar repo, memakai PowerShell. Node 24 dan pnpm 12.16.1 mengikuti lingkungan yang diuji serta CI. Berkas konfigurasi aktual tidak masuk git.

## 1. Klon dan pasang dependency

```powershell
git clone https://github.com/Ammartriwahyu/TikumGriyashanta.git
Set-Location TikumGriyashanta
node --version
pnpm --version
pnpm install --frozen-lockfile
```

Gunakan branch/commit yang dipilih untuk rilis; checkout default GitHub perlu memuat perubahan yang akan didemokan. Jika pnpm belum tersedia, pasang versi packageManager dengan `npm install --global pnpm@12.16.1`. Instalasi pertama memerlukan registry; waktu bergantung pada jaringan/cache.

## 2. Buat konfigurasi lokal

Perintah ini menjaga berkas yang sudah ada:

```powershell
if (!(Test-Path -LiteralPath backend/.env)) { Copy-Item -LiteralPath backend/.env.example -Destination backend/.env }
if (!(Test-Path -LiteralPath frontend/.env.local)) { Copy-Item -LiteralPath frontend/.env.example -Destination frontend/.env.local }
```

Isi sendiri pada perangkat. Contoh yang baru disalin masih kosong dan belum dapat menjalankan layanan dengan benar. Semua `.env*` aktual di-ignore; hanya `.env.example` masuk git.

| Backend, backend/.env | Isi |
|---|---|
| NODE_ENV, PORT | development, 8787 |
| FRONTEND_ORIGIN | http://localhost:3000, harus cocok dengan origin browser |
| SUPABASE_URL | URL proyek khusus data fiktif demo |
| SUPABASE_SECRET_KEY | Secret key proyek, hanya backend |
| GEMINI_API_KEY, GEMINI_MODEL | Kunci AI Studio dan model yang tersedia bagi kunci itu; pemilik kunci memenuhi syarat usia ≥18 tahun |
| AI_DAILY_LIMIT | Jatah harian per rumah tangga; bawaan 20, cocokkan dengan kuota tim |
| SCAN_TOKEN_SECRET | Nilai acak minimal 32 karakter dari pengelola rahasia |
| DEMO_EMAIL, DEMO_PASSWORD | Hanya untuk seed demo; akun khusus publik, kata sandi minimal 8 karakter |

| Frontend, frontend/.env.local | Isi |
|---|---|
| NEXT_PUBLIC_API_URL | http://localhost:8787 |
| NEXT_PUBLIC_SUPABASE_URL | Proyek Supabase yang sama dengan backend |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key, bukan secret key |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Opsional: public key pasangan backend push; kosong berarti pengingat belum tersedia |

NEXT_PUBLIC_* dikirim ke browser. Kunci Supabase secret, Gemini dan HMAC tidak ditempatkan di frontend. Backend push opsional: biarkan PUSH_ENABLED=false untuk MVP; CRON_SECRET/VAPID baru wajib saat true. [Konfigurasi dan API push](web-push-backend.md).

## 3. Siapkan database dan Auth sekali

Pada proyek Supabase baru khusus data fiktif, buka SQL Editor dan jalankan seluruh enam berkas di [folder migrasi](../backend/supabase/migrations) berurutan:

1. 20261110120000_initial_schema.sql
2. 20261110130000_add_medicine_purpose.sql
3. 20261111120000_consume_ai_usage.sql
4. 20261111180000_dose_confirmation_atomic.sql
5. 20261112040000_scan_confirmation_identity.sql
6. 20261113120000_push_reminder_claims.sql

SQL aplikasi menjadi sumber skema; jangan membuat tabel tiruan atau membuka RLS untuk klien publik. Pada proyek yang sudah bermigrasi, periksa riwayat agar tidak diterapkan dua kali. Migrasi cloud mengubah target dan dilakukan operator pada proyek yang disetujui. [Workflow migrasi Supabase](https://supabase.com/docs/guides/local-development/database-migrations) menjelaskan CLI dengan migration history otomatis.

Di Authentication → URL Configuration, atur Site URL lokal `http://localhost:3000`; untuk deployment gunakan frontend resminya. Izinkan URL kembali yang tepat, bukan alamat backend ([Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)). Aplikasi memakai email/kata sandi; sesudah konfirmasi email masuk kembali lewat login. Tidak ada route OAuth callback aplikasi.

Sesudah konfigurasi dan tabel lengkap:

```powershell
pnpm --filter backend db:check-rls
```

Harus berakhir `RLS OK`. Galat jaringan/kunci/hasil tidak dapat diperiksa tidak dianggap RLS benar. Perintah memakai konfigurasi publik frontend untuk memeriksa akses ke enam tabel, bukan secret key frontend.

### Opsi Supabase lokal

Butuh Docker berjalan. Dari akar repo:

```powershell
Push-Location backend
npx supabase@3.1.0 start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
Pop-Location
```

Isi konfigurasi perangkat dari URL/key lokal CLI. Perintah dijalankan dalam backend karena config.toml berada di backend/supabase. Auth/PostgREST/PostgreSQL tetap digunakan; Gemini tetap layanan jaringan. Docker tidak tersedia pada mesin row50, jadi opsi ini belum dijalankan ulang. `db reset` menghapus database lokal dan bukan langkah startup harian.

## 4. Menyalakan aplikasi setelah persiapan

```powershell
pnpm dev
```

- Frontend: [http://localhost:3000](http://localhost:3000).
- Backend: [http://localhost:8787/v1/health](http://localhost:8787/v1/health).
- Health harus HTTP 200 `{"status":"ok"}` saat database terbaca. HTTP 503 DATABASE_UNAVAILABLE berarti belum siap; proses listen saja bukan bukti demo siap.

Pertahankan terminal terbuka; hentikan dengan Ctrl+C. Kompilasi pertama membutuhkan waktu tersendiri. Supabase cloud dan Gemini memerlukan jaringan meskipun aplikasi memakai localhost; tidak ada hasil AI/database palsu saat offline.

## 5. Menyiapkan Akun Demo Juri

Kredensial akun demo tercantum di [README](../README.md#akun-demo-juri). Isi DEMO_EMAIL/DEMO_PASSWORD di backend/.env dengan nilai yang sama, lalu jalankan:

```powershell
pnpm --filter backend seed:demo
```

Seed membuat/memulihkan akun ber-ID tetap dengan email terkonfirmasi, persetujuan data dan is_demo. Data fiktif awal: Amlodipin 5 mg (07.00/19.00, apoteker) dan Metformin 500 mg (12.00/18.00, keluarga). Seed mengembalikan sandi, menghapus obat tambahan/catatan demo, serta mengosongkan persetujuan scan dan pilihan keluaran. Jalankan sebelum sesi demo ketika akun sedang tidak dipakai; akun lain tidak direset.

Setelah seed berhasil, buka `/login`, ketik email dan kata sandi demo, lalu tekan **Masuk** (tidak ada tombol masuk demo sejak 14 November 2026; juri masuk seperti pengguna biasa). Akun demo dilindungi dari penghapusan, tetapi datanya dapat diubah pemakai sehingga bukan tempat data pribadi.

Untuk latihan dosis jatuh tempo sekarang:

```powershell
pnpm --filter backend seed:demo-due
```

Perintah mereset demo dan menggeser satu jadwal Metformin ke menit sekarang dalam WIB; jendela berakhir 120 menit setelah jadwal. Kembali normal dengan `seed:demo`. Bukti login/scan layanan nyata tetap mengikuti [checklist manual](manual-test-checklist.md), bukan disimpulkan dari seed/unit test.

## Pemeriksaan dan bantuan

| Gejala | Pemeriksaan |
|---|---|
| Backend berhenti menyebut variabel | Isi semua konfigurasi wajib, termasuk Gemini dan SCAN_TOKEN_SECRET |
| Health 503 | Periksa URL/key backend, seluruh migrasi dan kesiapan proyek Supabase |
| CORS ditolak | FRONTEND_ORIGIN harus cocok dengan scheme/host/port; localhost dan 127.0.0.1 berbeda origin |
| Konfirmasi email | Konfirmasi lalu masuk lagi; seed demo memakai email_confirm=true |
| AI gagal/kuota habis | Periksa persetujuan/kuota; tersedia teks pengisi saat simpan dan dialog konfirmasi tanpa scan bila memang sudah minum |
| Suara Indonesia tidak tersedia | Teks tetap terlihat; siapkan suara lokal Indonesia pada perangkat dan uji ulang |
| HP kedua belum memperbarui | Muat ulang atau kembali fokus; dasbor juga diperbarui setiap 20 detik saat aktif |

Gerbang kode: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter frontend build`. Jalankan tes frontend tanpa lint/build/dev lain bersamaan. HTTP E2E memakai SQL memori dan Auth/PostgREST/AI tiruan; itu bukan bukti layanan/perangkat. Lihat [laporan P15](review-report.md) dan [hasil klon bersih](clean-clone-test.md).
