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

Backend berjalan di `http://localhost:8787` dan frontend di `http://localhost:3000`. Tanpa `.env`, backend tetap menyala untuk pengembangan (`FRONTEND_ORIGIN` default `http://localhost:3000`); fitur yang butuh Supabase atau Gemini memerlukan nilainya.

## Akun Demo Juri

*(menyusul)*

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

*(menyusul)* Sumber daftar obat familiar pada formulir Tambah Obat.
