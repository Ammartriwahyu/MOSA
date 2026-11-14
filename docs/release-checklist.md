# Pemeriksaan dan gerbang rilis

13 November 2026 · row51 · **persiapan lokal saja**, sesuai keputusan PM. Belum ada deploy, perubahan cloud, seed live, cron aktif, rekaman atau tag freeze. Koneksi Vercel yang diperiksa belum menampilkan proyek repo ini.

**Belum siap freeze.** Kelulusan pemeriksaan kode tidak menggantikan bukti layanan/perangkat. Status kriteria penerimaan masih 20 Lulus otomatis, 6 Belum lengkap, 0 Gagal.

## Bukti lokal row51

| Pemeriksaan | Hasil |
|---|---|
| Node runtime dan manifest | Node 24.15.0; engines.node 24.x pada akar, frontend dan backend; pnpm tetap 12.16.1 |
| Cadangan seed dan lima migrasi | Tujuh entri arsip cocok dengan commit sumber; checksum dicatat di [runbook demo](demo-runbook.md) |
| pnpm typecheck | Lulus pada kedua paket, 8,46 dtk |
| pnpm lint | Lulus termasuk 48 probe batas impor, 35,58 dtk |
| pnpm test | Lulus: 677 backend/44 berkas dan 559 frontend/49 berkas, termasuk 11 HTTP E2E; keseluruhan 67,31 dtk |
| Dokumentasi | 37 tautan lokal/enam anchor valid; enam blok PowerShell lolos pemeriksaan sintaks; diff check bersih |
| Build dan startup dari klon bersih | Bukti row50 saja; konfigurasi fiktif, health 503, bukan alur layanan nyata |

Tidak ada perubahan fitur, dependensi atau skema pada row51. Konfigurasi dashboard/build cloud tetap perlu dicocokkan dengan [panduan deploy](deploy.md) ketika target tersedia.

Pemeriksaan tipe, lint dan suite penuh dijalankan berurutan satu kali pada Node 24.15.0/pnpm 12.16.1. Build tidak diulang pada row51; bukti row50 dan batasnya tetap tercatat terpisah. Setelah pengguna commit/push, sarankan satu PR dari chore/release-prep ke main untuk seluruh tumpukan, CI hijau dan **Create a merge commit**. Merge kode tidak menutup gerbang layanan/perangkat di bawah.

## Target yang harus dicatat sebelum tindakan layanan

| Isian | Status saat ini |
|---|---|
| Pemilik/team dan proyek Vercel frontend/backend | Belum ditetapkan |
| URL pasangan frontend/backend dan Preview/Production | Belum ditetapkan |
| Commit kandidat yang sudah dipush dan CI-nya hijau | Diisi setelah commit/push pengguna; jangan menganggap HEAD sebelum commit sebagai kandidat akhir |
| Proyek Supabase, enam migrasi/RPC/RLS dan konfigurasi Auth | Belum diverifikasi pada tahap rilis ini |
| Pemilik kunci/model Gemini dan kuota | Belum diverifikasi pada tahap rilis ini |
| Akun Demo Juri yang boleh dipublikasikan | Belum ditetapkan; [cara menyiapkan](local-development.md#5-menyiapkan-akun-demo-juri) |
| Operator, perangkat, akun disposable dan waktu uji | Belum ditetapkan |

Catat hanya nama/URL/commit dan status konfigurasi, bukan nilai kunci, sandi atau token. Perubahan layanan dimulai setelah target serta tindakan disetujui. Pilihan PM saat ini hanya persiapan lokal.

## Smoke test saat layanan tersedia

Jalankan pada pasangan target yang dicatat, memakai data fiktif. Isi hasil aktual dengan waktu, commit, perangkat dan bukti yang sudah dibersihkan; semua baris berikut **belum dijalankan pada row51**.

| Langkah | Syarat lulus |
|---|---|
| Health backend | GET /v1/health HTTP 200 dengan status ok; 503 atau halaman login deployment berarti belum lulus |
| Frontend dan CORS | Buka URL frontend resmi dan pastikan permintaan API berhasil dari browser. Origin lain tidak memperoleh izin CORS; CORS bukan pengganti autentikasi |
| Auth dan consent | Login demo berhasil, penanda terlihat, sesi bertahan; akun uji baru diminta persetujuan data dan tidak dapat melewatinya |
| Tambah/edit obat | AI tidak menyimpan sendiri; koreksi dan konfirmasi manusia diperlukan; jalur AI gagal tetap jujur memakai teks pengisi |
| Scan | Consent, kemasan cocok/beda kekuatan/buram/di luar jendela; hanya hasil sah memberi aksi konfirmasi dan tidak ada pencatatan otomatis |
| Catat minum | Pilihan slot, tanda scan/dasar dan hitungan dari server benar; permintaan ganda tidak mencatat dua kali; M05 diuji sesuai checklist |
| Teks/suara dan perangkat kedua | Tidak autoplay; suara lokal/teks, kamera/unggah, zoom/fokus dan pembaruan sesi kedua diperiksa pada Android/iOS |
| Hapus akun uji | Hanya akun disposable yang disetujui; pengguna Auth/enam tabel hilang, token ditolak, akun lain utuh; akun demo tidak dapat dihapus |
| Log dan privasi | Tidak ada kunci/sesi, teks pengguna, identitas obat atau foto pada log yang ditinjau |

Rincian langkah dan status per perangkat ada di [checklist manual](manual-test-checklist.md). Jangan mengisi Lulus berdasarkan suite dengan transport uji. Enam AC yang belum lengkap perlu bukti masing-masing; satu health 200 belum menutup semuanya.

## Pemantauan harian yang belum diaktifkan

Setelah backend publik yang benar mendapat health 200 dan operator menyetujui, rencanakan cron-job.org berikut:

| Pengaturan | Nilai rencana |
|---|---|
| Target | URL backend resmi + /v1/health |
| Metode/header/body | GET; tanpa Bearer/kunci/body karena endpoint publik |
| Jadwal | Setiap hari 10.00, zona Asia/Jakarta (usulan operasional, belum dibuat) |
| Syarat uji | Eksekusi manual dari layanan pemantauan mendapat 200/status ok, bukan redirect/protection page |
| Bukti | Operator mencatat job ID, target, zona/jadwal, waktu dan hasil; tanpa API key |

[Dokumentasi cron-job.org](https://docs.cron-job.org/rest-api.html) menjelaskan metode HTTP dan jadwal dengan zona waktu. Endpoint health tidak menjamin layanan gratis tidak dipause; periksa status dan kuota sebelum demo. Backend P14 menyediakan endpoint cron push opsional; frontend/worker kini tersedia, tetapi job per menit tetap menunggu target dan pengujian perangkat. CRON_SECRET/VAPID hanya wajib jika PUSH_ENABLED=true; lihat [panduan push](web-push-backend.md).

## Jika kandidat rilis bermasalah

Hentikan promosi. Catat commit serta pasangan deployment terakhir yang terbukti bekerja dan bandingkan konfigurasi frontend/backend sebelum operator memulihkan target tersebut. Jangan menjalankan seed/reset database untuk memperbaiki kegagalan build. Pemulihan deployment tidak memulihkan data atau membatalkan migrasi; tinjau kompatibilitas skema dan konfigurasi publik yang dibekukan saat build. Sesudah perubahan, ulangi smoke test pasangan yang aktif.

Saat ini belum ada pasangan deployment terakhir yang diverifikasi pada pekerjaan ini. Pemulihan seed demo dan tindakan saat jaringan/AI gagal ada di [runbook demo](demo-runbook.md).

## Gerbang sebelum tag freeze

Semua butir harus memiliki bukti sebelum pengguna menjalankan perintah di bawah:

- [ ] Kandidat final telah ditinjau, di-commit dan dipush; working tree bersih, CI hijau pada SHA yang sama.
- [ ] Target/lingkungan disetujui; konfigurasi Node/pnpm, environment, CORS, Auth, migrasi/RLS dan layanan cocok dengan kandidat.
- [ ] Smoke test layanan nyata dan checklist perangkat lulus; enam AC terbuka diselesaikan dan matriks diperbarui dengan bukti.
- [ ] Akun demo publik ditetapkan dan diverifikasi, pemantauan harian diuji, cadangan seed tersalin ke perangkat cadangan, rekaman tersedia.
- [ ] Tim memutuskan kandidat siap dibekukan dan mencatat SHA serta hasil pemeriksaan. Tidak ada perubahan fitur sesudah freeze; hanya perbaikan kritis yang ditinjau.

**Perintah ini belum boleh dijalankan berdasarkan hasil row51 lokal saja.** Setelah semua gerbang di atas terpenuhi, dari commit final yang benar dan bersih:

```powershell
git status --short
git rev-parse HEAD
git tag v1.0.0-freeze
git push origin v1.0.0-freeze
```

Pengguna memeriksa dua keluaran pertama sebelum menjalankan dua baris tag/push. Jika nama tag sudah ada, berhenti dan periksa commitnya; jangan menimpa atau memaksa push tag. Agen tidak membuat, memindahkan atau mempush tag.
