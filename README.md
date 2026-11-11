# TepatMinum (MOSA)

Aplikasi web pendamping minum obat untuk lansia dan keluarga: membantu minum obat yang benar, di waktu yang benar, berdasarkan instruksi asli dari apoteker atau dokter, dengan scan kemasan sebagai verifikasi sebelum diminum.

LOGICODIX 2026 · kategori Web · subtema Inclusive Health & Well-being.

> Status: kerangka. Bagian bertanda *(menyusul)* dilengkapi di branch berikutnya.

## Struktur repo

| Folder | Isi |
|---|---|
| `frontend/` | Next.js (App Router, TypeScript), arsitektur feature-based *(menyusul)* |
| `backend/` | Hono + TypeScript, arsitektur DDD berlapis *(menyusul)* |
| `docs/` | Konteks produk, aturan domain, kalimat baku, desain sistem, alur pengguna |

Database dan login memakai Supabase, diakses hanya oleh backend. Frontend hanya memakai Supabase Auth untuk login.

## Prasyarat

- Node.js 20.9 atau lebih baru
- pnpm 12 (versi tepat ada di kolom `packageManager` pada `package.json`)

## Menjalankan di lokal

```bash
pnpm install
pnpm dev
```

`pnpm dev` menjalankan frontend dan backend bersamaan.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Menjalankan semua paket dalam mode pengembangan |
| `pnpm build` | Build semua paket |
| `pnpm typecheck` | Pemeriksaan tipe TypeScript |
| `pnpm lint` | Lint, termasuk batas lapisan backend dan batas fitur frontend |
| `pnpm test` | Tes otomatis |

Untuk satu paket: `pnpm --filter frontend <skrip>` atau `pnpm --filter backend <skrip>`.

## Variabel lingkungan

Salin contoh lalu isi nilainya. Berkas `.env*` selain `.env.example` tidak pernah masuk git.

| Contoh | Salin menjadi | Isi |
|---|---|---|
| `backend/.env.example` | `backend/.env` | Rahasia server: Supabase secret key, Gemini, rahasia token scan, rahasia cron |
| `frontend/.env.example` | `frontend/.env.local` | Nilai publik saja (`NEXT_PUBLIC_*`): alamat backend, URL dan publishable key Supabase |

Kunci rahasia hanya ada di backend. Jangan memberi awalan `NEXT_PUBLIC_` pada kunci rahasia karena nilainya akan ikut terkirim ke browser.

Backend berjalan di `http://localhost:8787` dan frontend di `http://localhost:3000`. Backend wajib punya `SUPABASE_URL` dan `SUPABASE_SECRET_KEY`; tanpa keduanya backend berhenti saat dinyalakan dan menyebut nama variabel yang kurang. `FRONTEND_ORIGIN` default `http://localhost:3000` di luar produksi. Cek cepat: `http://localhost:8787/v1/health` membalas `{"status":"ok"}` bila database terjangkau, atau `503 DATABASE_UNAVAILABLE` bila tidak.

## Database (Supabase)

Skema ada di `backend/supabase/migrations/` (SQL berurutan). RLS aktif di semua tabel tanpa kebijakan, dan hak `anon`/`authenticated` dicabut: hanya backend (secret key) yang bisa mengakses data. Tidak ada kolom foto.

Perintah Supabase CLI dijalankan dari folder `backend/` dengan `npx supabase@3.1.0 <perintah>`.

### Membangun ulang database dari nol (proyek cloud)

1. Buat proyek di [supabase.com](https://supabase.com), lalu salin URL, publishable key, dan secret key dari **Project Settings → API Keys** ke `backend/.env` dan `frontend/.env.local`.
2. Terapkan migrasi, pilih salah satu:
   - **CLI:** `npx supabase@3.1.0 login`, lalu `npx supabase@3.1.0 link --project-ref <ref-proyek>`, lalu `npx supabase@3.1.0 db push`.
   - **Tanpa CLI:** buka **SQL Editor**, tempel isi setiap berkas di `backend/supabase/migrations/` sesuai urutan nama, lalu jalankan. Aman dijalankan ulang.
3. Buktikan RLS menolak klien publik: `pnpm --filter backend db:check-rls`. Skrip ini memakai nilai publik di `frontend/.env.local` dan harus mencetak `RLS OK`.
4. Untuk menghapus semua data dan mengulang: hapus tabel lewat SQL Editor (atau buat proyek baru), lalu ulangi langkah 2–3.

### Database lokal (opsional, butuh Docker)

1. `npx supabase@3.1.0 start` menyalakan Supabase lokal dan menerapkan migrasi.
2. `npx supabase@3.1.0 db reset` membangun ulang dari nol.
3. `npx supabase@3.1.0 stop` mematikannya.

## Akun Demo Juri

Akun demo berisi obat fiktif yang siap diuji: **Amlodipin 5 mg** (07.00 dan 19.00, diisi apoteker) dan **Metformin 500 mg** (12.00 dan 18.00, diisi keluarga). Persetujuan data sudah tercatat, dan akun ditandai `is_demo` sehingga tidak bisa dihapus.

Kredensial: *(diisi saat rilis)*

### Tombol "Masuk dengan Akun Demo Juri"

Halaman Masuk menampilkan tombol Quick Login bila `NEXT_PUBLIC_DEMO_EMAIL` dan `NEXT_PUBLIC_DEMO_PASSWORD` diisi di `frontend/.env.local` (nilainya sama dengan `DEMO_EMAIL`/`DEMO_PASSWORD` di `backend/.env`). Kosongkan keduanya untuk menyembunyikan tombol.

Nilai ini sengaja publik: ikut terkirim ke browser, sama seperti kredensial yang ditulis di README untuk juri. Risikonya, siapa pun bisa mengubah data atau kata sandi akun demo. Akun tidak bisa dihapus (`DEMO_PROTECTED`), dan `seed:demo` mengembalikan data serta kata sandinya. Saat masuk dengan akun demo, aplikasi menampilkan penanda "Akun Demo Juri".

### Menyiapkan akun demo

1. Isi `DEMO_EMAIL` dan `DEMO_PASSWORD` di `backend/.env`, bersama `SUPABASE_URL` dan `SUPABASE_SECRET_KEY`.
2. Pastikan migrasi sudah diterapkan (lihat bagian Database).
3. Jalankan `pnpm --filter backend seed:demo`.

Seed boleh dijalankan berulang. Setiap kali dijalankan, akun demo kembali ke keadaan awal: obat demo dipulihkan, obat tambahan dan catatan minum akun demo dihapus, serta persetujuan scan dan pilihan Teks/Suara dikosongkan agar alurnya bisa didemokan lagi. Akun lain tidak tersentuh.

### Latihan demo: dosis jatuh tempo sekarang

`pnpm --filter backend seed:demo-due` menggeser jadwal Metformin ke menit saat perintah dijalankan (WIB), sehingga dosisnya langsung jatuh tempo dan bisa dikonfirmasi selama 120 menit. Jalankan `pnpm --filter backend seed:demo` untuk mengembalikan jadwal normal.

## Deploy (Vercel)

> Langkah ini disusun dari dokumentasi resmi Vercel dan belum diuji pada proyek ini.

Buat **dua proyek Vercel** dari repo yang sama:

| Proyek | Root Directory | Framework (terdeteksi otomatis) | Entri |
|---|---|---|---|
| Frontend | `frontend` | Next.js | – |
| Backend | `backend` | Hono | `backend/src/index.ts` (`export default app`) |

Untuk kedua proyek:
1. Biarkan opsi **Include files outside of the Root Directory** aktif (bawaan) agar `pnpm-workspace.yaml` dan `pnpm-lock.yaml` di akar terbaca.
2. Tambah environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` agar Vercel memakai versi pnpm dari kolom `packageManager`.
3. Pilih Node.js 24.x di Project Settings.
4. Isi environment variable dari `.env.example` masing-masing di Project Settings, bukan di repo.

Isian yang saling bergantung:
- Backend `FRONTEND_ORIGIN` = URL produksi frontend (mis. `https://<frontend>.vercel.app`).
- Frontend `NEXT_PUBLIC_API_URL` = URL produksi backend.

Pemeriksaan setelah deploy: buka `https://<backend>.vercel.app/v1/health`, harus membalas `{"status":"ok"}`.

Untuk backend, Vercel juga mengenali `src/app.ts` dan `src/server.ts` sebagai entri. Karena itu, berkas pembuat app bernama `src/create-app.ts` dan server lokal bernama `src/local-server.ts`. Jangan mengganti namanya ke `app.ts` atau `server.ts`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) menjalankan `pnpm install --frozen-lockfile`, `typecheck`, `lint`, dan `test` pada setiap pull request dan setiap push ke `main`.

## Privasi dan batasan

- AI hanya menyederhanakan teks aturan pakai (diperiksa manusia sebelum disimpan) dan membaca nama serta kekuatan obat dari foto kemasan. Jadwal, status dosis, dan pencocokan dihitung oleh kode.
- Foto kemasan tidak disimpan.
- Aplikasi ini bukan pengganti nasihat apoteker atau dokter.

## Atribusi

**Daftar obat familiar** pada pilihan "Nama Obat" di formulir Tambah Obat (`frontend/src/features/medicines/data/familiar-medicines.ts`) berisi 15 nama obat generik yang umum dipakai lansia di Indonesia, dipilih tim produk (PRD §19.1 #3). Rujukan penamaan:

- Kementerian Kesehatan RI, *Formularium Nasional* (e-Fornas), [e-fornas.kemkes.go.id](https://e-fornas.kemkes.go.id)
- Badan POM RI, *Informatorium Obat Nasional Indonesia* (IONI), [pionas.pom.go.id/ioni](https://pionas.pom.go.id/ioni)

Daftar ini hanya membantu mengisi nama obat. Kekuatan, aturan pakai, dan jadwal selalu diisi sesuai resep oleh apoteker atau keluarga. Aplikasi tidak menyimpan database obat umum.
