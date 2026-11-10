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

*(menyusul)* Salin `frontend/.env.example` dan `backend/.env.example` menjadi `.env` di folder masing-masing. Berkas `.env` tidak pernah masuk git.

## Akun Demo Juri

*(menyusul)*

## Deploy

*(menyusul)*

## Privasi dan batasan

- AI hanya menyederhanakan teks aturan pakai (diperiksa manusia sebelum disimpan) dan membaca nama serta kekuatan obat dari foto kemasan. Jadwal, status dosis, dan pencocokan dihitung oleh kode.
- Foto kemasan tidak disimpan.
- Aplikasi ini bukan pengganti nasihat apoteker atau dokter.

## Atribusi

*(menyusul)* Sumber daftar obat familiar pada formulir Tambah Obat.
