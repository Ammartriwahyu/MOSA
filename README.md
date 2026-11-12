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

### Memeriksa dasbor

Setelah env dan migrasi database tersedia, jalankan `pnpm dev`, masuk, lalu buka `/`. Akun tanpa obat menampilkan Tambah Obat Pertama. Dengan data demo jatuh tempo (`pnpm --filter backend seed:demo-due`), banner dan progres memakai respons `GET /v1/doses/today`; tanggal/jam ditampilkan dalam WIB. Kegagalan mengambil jadwal menampilkan Coba lagi. Tes terarah: `pnpm --filter frontend test src/features/doses`.

Dasbor mencakup banner, tombol Scan Obat, progres serta kartu Pagi/Siang/Malam. Kartu menampilkan status, label pengisi, progres per obat dan waktu pencatatan ✓/✓✓ dari backend. Slot hari sebelumnya dan jadwal besok yang sudah terbuka ditampilkan terpisah dengan tanggal asal. Dosis jatuh tempo menawarkan scan untuk slot tersebut atau Sudah minum tanpa scan → dialog pemeriksaan → Sudah saya minum. Batal/Esc tidak mencatat. Banner dengan beberapa dosis meminta pilihan jadwal untuk scan. Layar scan menyusul P11.

Jadwal diperbarui setiap 20 detik selama aplikasi aktif dan saat kembali fokus. Status serta hitungan tetap berasal dari server. POST konfirmasi tidak diulang otomatis atau diantrekan saat offline. Sesudah respons simpan terputus, Periksa jadwal memuat keadaan terbaru sebelum pengguna dapat mencoba lagi. Setelah simpan berhasil, banner lama disembunyikan sambil ringkasan dimuat ulang; bila pemuatan itu gagal, tanda terima tetap terlihat dan Coba lagi hanya mengulang GET.

Tes SQL dosing memakai dev dependency `@electric-sql/pglite` agar migrasi, trigger jadwal, batas waktu dan RPC konfirmasi dijalankan pada mesin PostgreSQL lokal tanpa Docker. Jalankan terarah dengan `pnpm --filter backend test tests/db/dosing-sql.test.ts`. Tes ini tidak menggantikan verifikasi koneksi, Auth dan PostgREST pada Supabase sesungguhnya.

### Memeriksa logika scan

`pnpm --filter backend test tests/unit/verification tests/unit/shared/strength-safety.test.ts` memeriksa pencocokan nama/kekuatan dan delapan hasil scan dengan data fiktif, tanpa Gemini, database, atau foto. Tabel prioritas mencakup kekuatan beda meskipun dosis sudah tercatat, dua obat pada jam sama, target slot eksplisit, overlap, dan pergantian tanggal.

Nama dan kekuatan memakai normalizer yang sama dengan penyimpanan obat. Kecocokan beberapa identitas obat ditolak untuk diperjelas, sedangkan beberapa jadwal terbuka pada satu obat dikembalikan sebagai pilihan pengguna. Alias Parasetamol/Paracetamol belum ditambahkan. Endpoint scan serta penerbit/verifier HMAC sudah dirakit; scan sendiri tidak mencatat dosis.

Adaptor `GeminiPackageReader` menerima JPEG/PNG/WebP maksimal **1.500.000 byte** sebelum base64, memeriksa MIME dan signature, lalu mengirim byte melalui `inlineData` ([dokumentasi Google](https://aistudio.google.com/docs/image-understanding?generate-content=true)). Tidak memakai Files API, disk, storage, atau log gambar; tidak mengirim metadata akun/jadwal. Pemeriksaan signature bukan dekode penuh gambar. JSON rusak/tidak sesuai skema menjadi `{names: [], strength: null, legible: false}`; jaringan/timeout/kuota tetap galat. Batas waktu total 20 detik termasuk maksimal satu retry 429/503.

Tes adaptor: `pnpm --filter backend test tests/infrastructure/gemini-package-reader.test.ts tests/infrastructure/gemini-json-generator.test.ts tests/unit/verification/package-image.test.ts`. Fixture berupa header biner dan respons sintetis di memori; belum ada uji akurasi/latensi foto nyata. API memeriksa persetujuan scan dan jatah harian per rumah tangga melalui `AiUsageLimiter` sebelum AI dipanggil.

`POST /v1/scan` memerlukan Bearer token serta persetujuan data dan scan. Kirim `Content-Type: application/json` dengan `{image: {mimeType: 'image/jpeg'|'image/png'|'image/webp', data: '<base64 standar tanpa awalan data:>'}, slotId?: '<id slot mentah>'}`. JSON base64 dipilih agar ukuran teks dapat dibatasi sebelum decoding; stream dibatasi hingga panjang base64 maksimum + 4.096 byte overhead, termasuk saat `Content-Length` hilang/salah. Jangan memakai multipart atau menulis foto ke berkas sementara. `householdId` selalu dari sesi.

Respons HTTP 200 membawa `outcome` dari delapan hasil, `serverTime`, dan data obat/`nextDose` sesuai hasil. Hanya `bisa_konfirmasi` memiliki `slots: [{slotId, medicineId, scheduledAt, scheduledDate, scheduledTime, scanToken, expiresAt}]`. Bentuk ini sama untuk satu atau beberapa slot; pengguna memilih tepat satu bila bertumpuk. POST `{mode: 'verified', scanToken}` ke `/v1/doses/{slotId}/confirm` setelah pengguna menyatakan sudah minum menghasilkan HTTP 201 dan `level: 'scan_terverifikasi'`. Token HMAC-SHA256 berlaku 5 menit, terikat pada rumah tangga/obat/slot serta fingerprint nama+kekuatan. Perubahan identitas atau jadwal sebelum simpan diperiksa ulang secara atomik; replay tidak menaikkan level konfirmasi lama.

Tes alur HTTP (Auth/AI/penyimpanan in-memory, HMAC nyata): `pnpm --filter backend test tests/interface/scan.routes.test.ts tests/infrastructure/hmac-scan-tokens.test.ts`. Tes migrasi/RPC: `pnpm --filter backend test tests/db/dosing-sql.test.ts`. Ini belum membuktikan koneksi Supabase/Auth/Gemini produksi atau konkurensi beberapa koneksi PostgreSQL.

### Mengambil foto scan

`/scan` dan `/scan?dosis=<slotId>` menyediakan persetujuan serta pengambilan foto. HP baru meminta kalimat baku persetujuan scan meskipun akun pernah setuju; flag lokal tidak mengganti persetujuan akun. POST `{kind: 'scan'}` harus sukses sebelum `hasSeenScanConsent` disimpan. Jika localStorage diblokir, persetujuan berlaku selama layar ini terbuka dan diminta lagi pada kunjungan baru. Kegagalan simpan tidak membuka kamera/unggah; POST tidak diulang atau diantrekan saat offline.

Kamera memakai input file `capture="environment"`; Unggah Foto memakai pemilih biasa. JPEG/PNG/WebP digambar ulang menjadi JPEG di browser, maksimum 1600 px pada sisi panjang dan 1.500.000 byte. Batas pemrosesan: file awal 20 MB, 48 juta piksel, waktu 15 detik; kualitas/dimensi diturunkan terbatas, foto kecil tidak diperbesar. HEIC/GIF/SVG ditolak dengan pilihan mengambil foto ulang. Foto/metadata nama berkas tidak masuk localStorage, query cache, log, atau backend pada tahap capture. Blob dan object URL dibuang saat mengganti foto, akun, target, atau meninggalkan layar.

Tes terarah: `pnpm --filter frontend test src/features/scan src/features/auth/api/household-scan.test.ts src/features/auth/hooks/use-session-identity.test.tsx`. Pratinjau browser 360/390/430 px dan kompresi canvas asli diuji dengan pola sintetis, tanpa foto obat/pasien. Pola 191.057 byte menjadi JPEG 42.465 byte pada 1600×1000; ini bukan ukuran/akurasi foto nyata. Android Chrome/iOS Safari dan kamera perangkat nyata belum diuji.

Gunakan Foto Ini mengirim JPEG yang sudah dikompres ke `POST /v1/scan` sebagai JSON base64 standar, tanpa nama berkas atau awalan data URL. Mode dosis tertentu mengirim `slotId` mentah yang telah divalidasi; mode umum tidak mengirim target. Delapan bentuk respons diperiksa dengan zod; slot yang berbeda dari target ditolak. Blob/base64/token hanya berada dalam memori alur aktif, tanpa query/mutation cache atau antrean offline. Pratinjau dibuang saat pengiriman dimulai. Batas waktu 25 detik mencakup pembacaan foto, pengambilan token sesi, HTTP dan pembacaan respons. Tidak ada retry otomatis; Batal menghentikan penantian di HP dan mengabaikan respons terlambat, namun pemrosesan server/jatah AI yang sudah berjalan mungkin tetap terpakai.

Galat jaringan/timeout/AI/kuota/respons tidak sah memakai kalimat baku #12; sesi, persetujuan, target hilang dan foto tidak sah ditangani terpisah. Uji browser mengirim pola JPEG sintetis melalui HTTP ke Hono/use case/HMAC nyata dengan Auth/AI/penyimpanan fiktif: sukses, batal, respons terlambat dan kuota habis; ini belum memverifikasi Supabase/Auth/Gemini nyata. Integrasi ini juga memperbaiki mapper backend agar `scheduledTime` berbentuk string `HH:mm`, sesuai kontrak.

### Hasil scan

Delapan hasil terstruktur kini tampil memakai kalimat baku: tidak terbaca, belum terdaftar, kekuatan tidak terbaca/berbeda, sudah tercatat, bisa dikonfirmasi, tunggu dulu dan hanya informasi. Nama tebakan AI untuk obat belum terdaftar tidak ditampilkan; Tambah Obat membuka formulir kosong. Kekuatan berbeda membandingkan seluruh kandidat terdaftar tanpa memilihkan salah satunya. Bila beberapa slot obat yang sama terbuka, pengguna memilih satu tanggal/jam; tidak ada pilihan otomatis dan pemilihan itu belum mencatat dosis. Konfirmasi minum beserta kedaluwarsa token tetap tahap berikutnya (row 39).

Informasi obat memakai komponen yang sama dengan Detail Obat: identitas/sumber, jadwal berikutnya dari server, penjelasan yang sudah diperiksa, informasi asli dan catatan. Snapshot scan tidak membawa seluruh jam minum atau metode/jam konfirmasi lama, sehingga UI tidak menebak data tersebut maupun tanda ✓/✓✓. Semua tanggal slot ditampilkan secara eksplisit. Tautan Lihat Informasi Obat membuka bagian lokal dan dapat kembali ke hasil tanpa kehilangan pilihan slot. Foto ulang membuang hasil dan kembali ke capture. Pembacaan suara menyusul P12.

Pesan #6 memakai jam dari `nextDose`; jika server mengirim `null`, varian DRAFT menyebut identitas dan obat jatuh tempo tanpa mengarang jam. Untuk beberapa slot obat lain, nama dalam pesan #6 disebut sekali per identitas obat, sedangkan tanggal/jam setiap slot tetap terlihat. UI tidak menghitung ulang jendela dosis atau mengubah hitungan. Tes komponen delapan hasil dan axe serta browser 360/390/430 px menggunakan data fiktif; nama panjang tanpa spasi juga diperiksa. Tidak ada pratinjau atau data tiruan pada jalur produksi.

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

Sebelum memakai API dosis, terapkan juga `20261111180000_dose_confirmation_atomic.sql`. Migrasi ini menambahkan waktu aktif per jam dan RPC `confirm_dose` untuk memeriksa jadwal serta menyimpan konfirmasi dalam satu transaksi. Perubahan jam langsung berlaku saat disimpan; konfirmasi lama dipertahankan.

Untuk konfirmasi scan, terapkan **`20261112040000_scan_confirmation_identity.sql`** setelah migrasi dosing, lalu isi **`SCAN_TOKEN_SECRET` minimal 32 karakter** di environment server. Rahasia acak 32 byte dengan encoding base64url disarankan; contoh perintah tersedia di `backend/.env.example`. RPC `confirm_scanned_dose` mengunci baris obat, memeriksa nama/kekuatan dari bukti scan, lalu menjalankan konfirmasi atomik yang sama. Hanya `service_role` boleh mengeksekusinya. Backend gagal startup bila rahasia tidak valid; tanpa migrasi RPC, konfirmasi verified gagal tertutup dengan galat database. Migrasi cloud dan alur dengan foto nyata belum dijalankan pada branch ini.

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
