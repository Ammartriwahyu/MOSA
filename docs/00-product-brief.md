# 00 · Ringkasan Produk

Sumber: `PRD_MOSA_LOGICODIX_2026.pdf` v2.0 (bagian dirujuk dengan "PRD §"). Bila ada selisih antara berkas ini dan PRD, PRD yang benar; laporkan selisihnya.

## Satu kalimat
Aplikasi web yang membantu lansia minum obat yang benar, di waktu yang benar, berdasarkan instruksi asli dari apoteker atau dokter, dengan scan kemasan obat sebagai verifikasi sebelum diminum.

- Nama: **TepatMinum / MOSA** (Medication Organizer, Scanner & Assistant). Nama final masih TBD (PRD §2, §19 #5); pakai `TepatMinum` di UI sementara.
- Konteks: LOGICODIX 2026, kategori Web, subtema Inclusive Health & Well-being.
- Tenggat: MVP **Kamis 12 Nov 2026 siang**; code freeze **Sabtu 14 Nov 2026 23.59 WIB**.
- Harus bisa jalan di `localhost` saat Grand Final dengan persiapan 1 menit (NFR-07).

## Masalah (PRD §3.1)
1. Banyak obat dengan jadwal berbeda (polifarmasi).
2. Instruksi mudah terlupa; etiket kecil dan penuh istilah.
3. Kemasan mirip, nama sama kekuatan beda, rawan tertukar atau terlewat.
4. Wali tidak selalu bisa mendampingi.

## Pengguna (PRD §4, §8)
| Peran | Akun | Bisa |
|---|---|---|
| Lansia | Satu akun bersama, sesi login tetap tersimpan | Lihat dashboard, scan info obat, scan verifikasi + konfirmasi minum, pilih Teks/Suara, "Sudah minum tanpa scan" |
| Wali (keluarga) | Akun yang sama, HP berbeda | Semua hak lansia + Tambah Obat (label "Diisi keluarga"), pantau status, hapus data |
| Apoteker/dokter | Tanpa akun; memakai HP pasien/wali | Isi atau periksa Tambah Obat (label "Diisi apoteker") dan periksa pop-up |

Karena akun dipakai bersama, **tidak ada pembedaan hak akses di sistem**; semua perangkat yang login punya hak yang sama.

## Empat pilar solusi (PRD §5.1)
1. Pencatatan fleksibel + verifikasi manusia atas teks AI (pop-up konfirmasi).
2. Akses kembali instruksi lewat scan kemasan.
3. Verifikasi kemasan saat waktunya minum + konfirmasi fleksibel (✓✓ dengan scan, ✓ tanpa scan).
4. Pemantauan bersama lewat dashboard harian.

## Tujuh aturan emas (PRD §5.2), tidak boleh dilanggar
1. AI tidak memberi saran medis; hanya membaca nama/kekuatan dari kemasan dan menyederhanakan kalimat instruksi.
2. Tidak ada teks AI yang sampai ke lansia tanpa diperiksa manusia.
3. Jadwal, pengingat, dan hitungan `1/2` dihitung oleh kode, bukan AI.
4. Kekuatan berbeda = obat berbeda → tolak dan beri peringatan.
5. Hanya foto kemasan yang diterima; butir tablet lepas ditolak.
6. Data kesehatan dilindungi: login aman, data hanya milik pemilik akun, persetujuan saat daftar, foto tidak disimpan, data bisa dihapus.
7. Tidak ada hasil palsu: semua fitur MVP benar-benar berfungsi (AI nyata, database nyata) saat demo.

## Cakupan (PRD §7)
**MVP (wajib):**
| ID | Fitur |
|---|---|
| MVP-01 | Akun bersama: sesi tetap, persetujuan data, hapus data, akun demo juri (+ tombol Quick Login Demo Juri) |
| MVP-02 | Tambah Obat (9 isian termasuk label sumber) + penjelasan AI + pop-up konfirmasi |
| MVP-03 | Dashboard harian: banner jatuh tempo, tombol besar "Scan Obat", kartu Pagi/Siang/Malam, status, hitungan 1/2 |
| MVP-04 | Scan kemasan untuk lihat info obat (persetujuan privasi sebelum scan pertama) |
| MVP-05 | Scan verifikasi saat waktunya minum + konfirmasi (✓✓), "Sudah minum tanpa scan" (✓) |
| MVP-06 | Output Teks atau Suara (TTS browser), tombol "Bacakan" di setiap hasil |

**Tambahan (hanya bila MVP stabil Kamis 12 Nov siang; bila tidak, jangan tampil di UI):**
ADD-01 Web Push (Tahap 2), ADD-02 AI isi formulir dari foto, ADD-03 riwayat mingguan, ADD-04 PWA install.

**Rencana pengembangan (JANGAN dibangun):** database obat umum Indonesia, akun apoteker, notifikasi ke wali saat terlewat, WhatsApp, AI berbayar.

## Indikator keberhasilan (PRD §17)
SM-01 100% obat lewat pop-up; SM-02 akurasi baca kemasan; SM-03 100% benar membedakan 4 kondisi scan; SM-04 konsistensi hitungan/✓ vs ✓✓/terlewat; SM-05 validasi pengguna nyata.

## Hal yang sengaja tidak ada
- Iklan di dalam aplikasi (hanya rencana produksi; bila kelak ada: dilarang di layar Scan, Konfirmasi Minum, Peringatan; tanpa penargetan data kesehatan).
- Database obat umum, akun apoteker, penyimpanan foto.
