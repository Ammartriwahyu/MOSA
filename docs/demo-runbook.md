# Cadangan dan pelaksanaan demo

13 November 2026 · persiapan lokal sesuai pilihan PM. Belum menjalankan seed pada layanan, merekam layar atau menguji perangkat pada tahap ini.

## Cadangan yang sudah dibuat

Arsip lokal `demo-seed-backup-20261113-4442b331dfb8.zip` berisi dua berkas seed TypeScript dan lima migrasi SQL dari commit `4442b331dfb848b4880cc4e65e79c9bd958d6738`:

- backend/supabase/seed/demo.ts dan demo-data.ts.
- Kelima berkas pada backend/supabase/migrations/.

Ukuran: **10.000 byte**. SHA-256 arsip:

```text
b8436f051f45d48ee5d6c14a7bd8d76b8d44a9dfe2c3520838cfb68b1866e785
```

Arsip dan berkas `.sha256` pendamping disimpan lokal di luar Git. Ketujuh entri diperiksa terhadap isi commit sumber dengan normalisasi CRLF/LF saja. Hash arsip di atas memeriksa byte ZIP persis; arsip yang dibuat ulang dapat memiliki hash berbeda.

Ini **cadangan seed fiktif dan skema**, bukan dump database atau cadangan akun/data pengguna. Tidak berisi .env, kredensial, sesi maupun foto. Sumbernya juga tersedia di Git. Simpan arsip di perangkat cadangan tim sebelum berpindah perangkat; cache lokal bukan penyimpanan permanen.

Untuk membuat arsip baru setelah commit rilis ditinjau, jalankan dari akar repo. Perintah menolak menimpa arsip lama:

```powershell
$demoBackupPath = Join-Path (Split-Path (Get-Location).Path -Parent) 'mosa-demo-seed-backup.zip'
if (Test-Path -LiteralPath $demoBackupPath) { throw 'Pilih nama cadangan baru; arsip lama sudah ada.' }
git archive --format=zip "--output=$demoBackupPath" HEAD backend/supabase/seed backend/supabase/migrations
if ($LASTEXITCODE -ne 0) { throw 'Pembuatan arsip gagal.' }
Get-FileHash -LiteralPath $demoBackupPath -Algorithm SHA256
git rev-parse HEAD
```

Catat hash baru beserta commit sumber. Arsip hanya mengambil berkas yang sudah di-commit; perubahan lokal tidak ikut. Jangan menambahkan .env atau dump pengguna ke daftar arsip.

## Pemulihan pada target demo yang disetujui

1. Verifikasi checksum arsip, lalu ekstrak ke direktori terpisah untuk diperiksa. Gunakan repo pada commit sumber yang cocok; jangan menimpa proyek aktif tanpa meninjau perbedaannya.
2. Arsip di atas merepresentasikan skema sebelum P14. Pada proyek Supabase baru dengan kode terkini, terapkan enam migrasi berurutan sesuai [panduan lokal](local-development.md#3-siapkan-database-dan-auth-sekali). Database yang sudah ada perlu pemeriksaan riwayat; jangan melakukan reset atau downgrade skema produksi.
3. Operator mengisi konfigurasi perangkat sendiri. Pilih akun demo publik terlebih dahulu; jangan memakai akun pribadi. Periksa RLS, lalu jalankan `pnpm --filter backend seed:demo` pada target demo yang telah disetujui.
4. Pastikan health 200, login demo dan penandanya, dua obat awal, persetujuan scan/pilihan keluaran serta hitungan awal yang sesuai jam server. Uji akun lain tetap utuh. Seed memulihkan sandi dan mereset data demo, bukan akun lain.
5. Untuk latihan segera, jalankan `pnpm --filter backend seed:demo-due`; satu dosis Metformin dijadwalkan pada menit sekarang dalam WIB. Kembalikan dengan `seed:demo` setelah latihan. Hentikan pemakaian akun demo selama reset.

Pemulihan tersebut **belum dijalankan pada row51**. Jangan menyebut arsip sebagai bukti pemulihan database berhasil.

## Persiapan hari demo

- Gunakan commit yang sudah ditinjau, Node 24 dan pnpm 12.16.1. Instal dependency serta siapkan layanan sebelum sesi; kompilasi pertama bukan bagian dari janji startup satu menit.
- Pastikan frontend/backend yang berpasangan, health 200, jam server WIB, akun demo, kuota AI dan jaringan tersedia. Localhost tetap memerlukan jaringan untuk Supabase/Gemini.
- Siapkan perangkat utama/cadangan dan jaringan cadangan. Kamera/unggah, suara lokal, teks, zoom dan sesi perangkat kedua perlu hasil nyata di [checklist manual](manual-test-checklist.md).
- Gunakan data fiktif dan kemasan uji tanpa identitas pasien. Aplikasi bukan alat medis; jangan memakai tablet lepas sebagai foto verifikasi.

## Rekaman layar yang perlu dibuat tim

Rekam pada commit/URL yang dicatat, setelah smoke test berhasil. Tampilkan login demo dan penanda, jadwal, tambah obat fiktif, pratinjau/perbaikan/konfirmasi teks AI, consent scan, kemasan cocok, lalu tindakan konfirmasi pengguna. Perlihatkan bahwa scan saja belum mencatat dosis; tunjukkan perbedaan tanda scan dan dasar serta pilihan Teks/Suara tanpa autoplay.

`seed:demo-due` menghasilkan satu slot Metformin (0/1 ke 1/1), bukan bukti skenario 1/2 ke 2/2. Untuk M05/AC yang memerlukan dua slot, gunakan obat uji dengan dua jadwal yang masih sah menurut server, lalu verifikasi urutan/hitungan pada [checklist manual](manual-test-checklist.md). Jangan memundurkan jam atau menganggap rekaman sebagai pengganti pengujian itu.

Rekam penghapusan hanya pada akun uji disposable, bukan akun demo. Jangan menampilkan konfigurasi, token atau identitas nyata. Simpan video di perangkat demo dan beri keterangan **rekaman**, commit serta tanggalnya. Rekaman belum dibuat pada pekerjaan ini.

## Jika demo terganggu

| Kejadian | Tindakan |
|---|---|
| Internet terputus | Coba jaringan cadangan. Localhost tidak menggantikan layanan cloud; bila tetap gagal, tampilkan rekaman yang diberi label, jangan mengaku demo langsung berhasil |
| Health 503 | Periksa backend/database dan status layanan; lanjutkan hanya setelah health 200. Jangan mengganti data dengan respons palsu |
| AI penjelasan gagal/kuota habis | Tunjukkan jalur teks pengisi setelah diperiksa dan dikonfirmasi; jelaskan bahwa AI gagal |
| Scan gagal/buram/kekuatan berbeda | Jangan mengonfirmasi dari scan. Ulangi foto yang sah; konfirmasi dasar hanya melalui tindakan dan dialog pengguna yang memang tersedia |
| Kamera ditolak | Gunakan unggah foto kemasan uji bila tersedia; periksa izin kamera tanpa melewati consent |
| Suara lokal tidak tersedia | Gunakan teks; jangan menambahkan layanan suara cloud mendadak |
| Respons konfirmasi tidak diketahui | Periksa jadwal dari server sebelum mengulang; jangan menambah hitungan sendiri |
| Data demo berubah | Operator dapat memulihkan seed pada target demo yang disetujui saat akun tidak dipakai; jangan mereset database lain |

Daftar gerbang rilis dan perintah freeze bersyarat ada di [checklist rilis](release-checklist.md).
