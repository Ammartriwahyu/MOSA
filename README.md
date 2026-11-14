# MOSA

Pendamping minum obat untuk lansia dan keluarga: jadwal harian, instruksi yang diperiksa manusia, serta scan kemasan sebelum konfirmasi minum. LOGICODIX 2026 · Web · Inclusive Health & Well-being.

**Bukan alat medis atau pengganti nasihat dokter/apoteker.** Instruksi diisi dari sumber asli. AI membantu membaca kemasan dan menyederhanakan teks; jadwal, kecocokan nama/kekuatan, jendela dosis dan hitungan ditentukan kode.

## Status

Fitur MVP telah diimplementasikan dan diuji otomatis. Pemeriksaan perangkat dan layanan nyata dilakukan manual oleh tim.

Pengingat Web Push dan PWA tersedia sebagai fitur opsional; aktivasinya membutuhkan pasangan kunci VAPID di backend/frontend, `PUSH_ENABLED=true`, dan pemicu cron ke `POST /v1/internal/reminders/run`. Pengingat wali, AI pengisi formulir dan riwayat mingguan belum dibangun. Akun Demo Juri publik **belum ditetapkan**; lihat penyiapan di bawah.

## Menjalankan di localhost

Prasyarat: Git, **Node.js 24**, **pnpm 12.16.1**, proyek Supabase yang sudah dimigrasikan, serta konfigurasi Gemini. Versi pnpm dipin pada packageManager. Supabase cloud dan Gemini tetap memerlukan jaringan saat UI/backend berjalan di localhost.

Persiapan pertama, dari PowerShell:

```powershell
git clone https://github.com/Ammartriwahyu/TikumGriyashanta.git
Set-Location TikumGriyashanta
pnpm install --frozen-lockfile
if (!(Test-Path -LiteralPath backend/.env)) { Copy-Item -LiteralPath backend/.env.example -Destination backend/.env }
if (!(Test-Path -LiteralPath frontend/.env.local)) { Copy-Item -LiteralPath frontend/.env.example -Destination frontend/.env.local }
```

Pilih branch/commit rilis yang sudah ditinjau. **Isi nilai kosong sebelum menyalakan aplikasi**, terapkan seluruh migrasi di `backend/supabase/migrations/` secara berurutan, lalu periksa RLS. Contoh konfigurasi saja belum cukup untuk menjalankan Auth/database/AI.

Setelah persiapan tersebut selesai, setiap kali ingin membuka demo:

```powershell
pnpm dev
```

- Aplikasi: [http://localhost:3000](http://localhost:3000).
- Pemeriksaan backend: [http://localhost:8787/v1/health](http://localhost:8787/v1/health), harus HTTP 200 `{"status":"ok"}` ketika database siap.
- Pertahankan terminal terbuka; Ctrl+C menghentikan layanan.

Instalasi dependency, penyediaan layanan dan kompilasi pertama memiliki waktu tersendiri. README ini tidak menjanjikan penyiapan dari nol dalam satu menit. Startup proses atau health 503 belum berarti demo siap.

## Akun Demo Juri

Juri masuk seperti pengguna biasa: buka `/login`, ketik email dan kata sandi berikut, lalu tekan **Masuk**. Akun ini hanya berisi data fiktif dan dilindungi dari penghapusan.

| Email | Kata sandi |
|---|---|
| `demo@mosa.com` | `mosakeren` |

Akun dibuat oleh tim dari DEMO_EMAIL/DEMO_PASSWORD di backend/.env (nilai di atas harus sama dengan isi berkas itu).

Sesudah database/environment tersedia:

```powershell
pnpm --filter backend seed:demo
```

Data awal: Amlodipin 5 mg (07.00/19.00, apoteker) dan Metformin 500 mg (12.00/18.00, keluarga). Seed juga mengembalikan kata sandi akun demo, sehingga sesi yang sedang terbuka perlu masuk ulang. Akun ditandai sebagai akun demo di database (tanpa penanda di layar) dan dilindungi dari penghapusan.

Untuk latihan dosis jatuh tempo sekarang:

```powershell
pnpm --filter backend seed:demo-due
```

Seed mereset obat tambahan/catatan akun demo; jalankan sebelum sesi demo saat akun tidak dipakai. Mode due menjadwalkan satu dosis Metformin pada menit sekarang dalam WIB, terbuka sampai 120 menit setelah jadwal. Kembali ke jadwal normal dengan `seed:demo`.

## Fitur dan batas penggunaan

| Area | Perilaku |
|---|---|
| Akun bersama | Email/kata sandi Supabase, sesi persisten, persetujuan data, keluar dari HP ini dan hapus akun/data melalui konfirmasi |
| Obat | Tambah/ubah, sumber apoteker/keluarga, jadwal, pratinjau AI yang wajib diperiksa, fallback teks pengisi, detail dan hapus lunak |
| Dasbor | Status/hitungan dari server, banner jatuh tempo, kelompok Pagi/Siang/Malam, pemuatan ulang berkala saat aktif |
| Scan kemasan | Persetujuan, kamera/unggah, pencocokan nama dan kekuatan; scan belum mencatat dosis |
| Pencatatan minum | ✓✓ setelah scan sah dan konfirmasi pengguna; ✓ tanpa scan melalui dialog; tanpa retry POST otomatis |
| Teks/suara | Pilihan keluaran dan Bacakan setelah gestur; hanya suara Indonesia lokal yang tersedia di perangkat, teks tetap tampil saat suara gagal |

Jendela dosis memakai J−30 hingga J+120 menit inklusif dalam WIB. Slot bertumpuk tetap tersedia untuk dipilih. Perubahan jam berlaku saat disimpan dan riwayat konfirmasi dipertahankan. Aplikasi tidak memutuskan dosis, mengubah resep atau menebak kemasan buram/kekuatan berbeda. Foto tidak disimpan oleh aplikasi; ketentuan penyedia AI tetap diperiksa tim dan data demo selalu fiktif.

Tidak ada mode produk dengan AI/database palsu untuk menggantikan layanan yang mati. Tes memakai fixture khusus tes. Kamera, suara, pembaca layar, sesi dua HP, retensi penyedia dan deployment perlu pemeriksaan manual.

## Perintah dan struktur

| Perintah dari akar | Fungsi |
|---|---|
| pnpm dev | Frontend dan backend lokal |
| pnpm typecheck | Pemeriksaan tipe kedua paket |
| pnpm lint | Lint dan 48 pemeriksaan batas impor |
| pnpm test | Unit/integrasi/HTTP E2E; tanpa kredensial layanan nyata |
| pnpm --filter frontend build | Build produksi frontend |
| pnpm --filter backend bench:local | Angka API/entry lokal dengan layanan tiruan dan SQL memori |
| pnpm --filter frontend bench:bundle | Ukuran aset HTML halaman utama setelah build |

Jalankan tes frontend tanpa lint/build/dev lain bersamaan. CI menjalankan install frozen, typecheck, lint dan test pada PR serta push main.

- frontend/: Next.js App Router, arsitektur berbasis fitur.
- backend/: Hono, domain/application/infrastructure/interface; database hanya diakses backend. Frontend memakai Supabase untuk Auth.
- backend/supabase/migrations/: skema, RLS dan RPC aplikasi.
- docs/02-copywriting-baku.md: kalimat baku keselamatan yang dicocokkan otomatis oleh tes copy.

## Deploy

Frontend dan backend dideploy sebagai dua proyek Vercel (Root Directory `frontend` dan `backend`, Node 24.x). Isi environment sesuai `frontend/.env.example` dan `backend/.env.example`; variabel `NEXT_PUBLIC_*` bertipe Config dan perlu redeploy setelah diubah, kunci rahasia backend bertipe Sensitive. Atur `FRONTEND_ORIGIN` backend ke URL frontend, serta Site URL dan Redirect URLs Supabase Auth.

## Atribusi

Daftar 15 nama generik familiar di formulir hanya membantu pengisian nama; kekuatan dan instruksi tetap dari resep/sumber asli. Penamaan merujuk Kementerian Kesehatan RI, [Formularium Nasional (e-Fornas)](https://e-fornas.kemkes.go.id), dan BPOM, [Informatorium Obat Nasional Indonesia (IONI)](https://pionas.pom.go.id/ioni). Aplikasi tidak memiliki database obat umum atau rekomendasi pengobatan.
