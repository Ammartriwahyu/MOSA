# Checklist pengujian perangkat

Status awal, 12 November 2026: **seluruh pemeriksaan perangkat nyata di bawah belum dijalankan**. Tes HTTP otomatis tidak membuktikan kamera, suara, pembaca layar, sesi browser, atau perilaku Android/iOS. Isi hasil setelah mencoba pada perangkat yang disebutkan; jangan menandai lulus berdasarkan tes tiruan.

## Persiapan dan pencatatan

- Gunakan proyek Supabase lokal/uji, akun sekali pakai non-demo, serta nama pasien dan data obat fiktif. Bila konfirmasi email aktif, gunakan alamat uji yang Anda kendalikan.
- Terapkan semua migrasi secara berurutan; konfigurasi backend/frontend mengikuti README. Foto uji memakai kemasan tiruan tanpa identitas pasien. Foto tidak disimpan atau dicantumkan dalam bukti.
- Siapkan satu obat dengan dua jadwal dan satu obat lain pada jam yang sama. Untuk demonstrasi jatuh tempo, akun demo dapat disiapkan dengan `pnpm --filter backend seed:demo-due`; penghapusan akun diuji dengan akun sekali pakai non-demo.
- Catat tanggal/jam WIB, versi aplikasi/commit, perangkat, versi OS/browser, koneksi, skenario, hasil sebenarnya, dan bukti yang tidak memuat foto, kredensial, token, atau data pribadi.

| Lingkungan | Perangkat / versi OS / browser | Versi aplikasi | Penguji / waktu WIB | Hasil |
|---|---|---|---|---|
| Android Chrome | Belum dicatat | Belum dicatat | Belum dicatat | Belum diuji |
| iPhone Safari | Belum dicatat | Belum dicatat | Belum dicatat | Belum diuji |
| HP kedua / akun yang sama | Belum dicatat | Belum dicatat | Belum dicatat | Belum diuji |

## Alur utama pada Android Chrome dan iPhone Safari

Jalankan M01–M10 pada masing-masing perangkat. Periksa pesan dan teks asli di layar; pilihan dan konfirmasi harus dilakukan pengguna.

| ID | Langkah | Hasil yang diharapkan |
|---|---|---|
| M01 | Daftar tanpa mencentang persetujuan, lalu centang dan daftar; selesaikan konfirmasi email bila aktif. Tutup dan buka browser lagi. | Tanpa persetujuan tidak lanjut. Setelah masuk/persetujuan berhasil, jadwal dapat dibuka dan sesi tersimpan. Galat daftar tidak membuka akses. |
| M02 | Tambah obat, pilih nama atau ketik sendiri, isi seluruh kolom dan label sumber. Tekan Lanjut. Di pop-up tekan Perbaiki lagi, koreksi, lalu ulangi dan tekan Ya, sudah benar. | Data asli dan pratinjau AI dapat dibaca/digulir. Perbaiki lagi mempertahankan isian dan belum menyimpan. Obat baru muncul setelah Ya, sudah benar; label sumber sesuai pilihan. |
| M03 | Buka dasbor sebelum dan selama jendela dosis; baca progres serta tanggal/jam. | Kelompok Pagi/Siang/Malam, status dan hitungan mengikuti server. Dosis tidak ditambahkan mundur sebelum waktu obat disimpan. Untuk skenario batas, gunakan waktu server uji terkendali; jam HP bukan penentu. |
| M04 | Pada penggunaan scan pertama, tolak/tunda lalu setujui persetujuan scan. Pilih kamera atau unggah foto uji; ambil ulang sebelum mengirim. | Sebelum persetujuan tidak memproses foto. Foto yang dipilih dapat ditinjau/diganti; hanya foto yang disetujui dikirim. Persetujuan per HP dan akun tidak membocorkan foto antarakun. |
| M05 | Scan obat yang sesuai jadwal. Saat pilihan tampilan muncul, simpan Teks/Suara. Periksa hasil, tekan Lanjut, lalu Nanti dulu. Scan lagi, periksa, lalu Sudah saya minum. | Nanti dulu tidak mencatat dan kembali ke jadwal. Sesudah konfirmasi berhasil tampil ✓✓ dan hitungan naik tepat satu. Tidak ada suara otomatis, termasuk saat mode Suara dipilih. |
| M06 | Pada dosis lain yang jatuh tempo, pilih Sudah minum tanpa scan. Coba Batal, kemudian ulangi dan konfirmasi. | Batal tidak mengubah hitungan. Konfirmasi berhasil tampil ✓; berbeda dari ✓✓. Ketukan ganda tidak mencatat dua kali. |
| M07 | Scan kedua obat yang berjam sama, lalu coba dua jadwal obat yang bertumpuk. | Memindai satu obat hanya memengaruhi obat itu. Bila beberapa slot ditawarkan, tidak ada pilihan awal; pengguna memilih satu, tanggal/jam terlihat, dan slot lain tidak ikut tercatat. |
| M08 | Uji foto buram/tanpa tulisan, obat belum terdaftar, kekuatan berbeda/tidak terbaca, obat di luar jendela, dan obat yang sudah tercatat. | Pesan sesuai hasil, tidak menebak, tidak memberi pilihan konfirmasi yang dilarang, dan hitungan tetap. Informasi obat hanya menampilkan AI yang sudah diperiksa atau informasi asli. |
| M09 | Pada pop-up pemeriksaan, detail obat, hasil scan dan banner, ketuk Bacakan/Berhenti. Saat berbunyi, tutup dialog, ganti halaman/slot, buka dialog lain, atau ganti akun. | Hanya ketukan yang memulai suara. Bacaan sesuai teks terlihat; berhenti pada pergantian konteks. Teks tetap tampil. Tanpa suara Indonesia lokal, pesan “Suara bahasa Indonesia belum tersedia di HP ini. Teks tetap bisa dibaca di layar.” muncul tanpa memilih bahasa lain. Catat terpisah ketersediaan suara dan apakah audio benar-benar terdengar. |
| M10 | Ubah obat melalui pemeriksaan ulang, lalu hapus satu obat. Setelah itu hapus seluruh data dan akun sekali pakai dengan dua tahap konfirmasi keamanan. Uji pembatalannya dahulu. | Edit tidak menghapus riwayat yang sudah tercatat; jadwal baru berlaku saat simpan. Hapus satu obat tidak menghapus akun. Batal tidak menghapus. Hapus akun menghilangkan akses sesi lama; keluarga lain tetap utuh. Akun demo menolak penghapusan. |

## Izin, jaringan dan aksesibilitas

| ID | Kondisi / langkah | Hasil yang diharapkan |
|---|---|---|
| M11 | Tolak izin kamera di OS/browser, batalkan pemilih foto, lalu coba unggah berkas. | Tidak ada foto/klaim hasil yang dibuat otomatis, tidak ada konfirmasi dosis. Setelah pemilih ditutup, pengguna dapat mencoba lagi atau memilih unggahan. Catat apakah petunjuk pemulihannya cukup jelas pada OS tersebut. |
| M12 | Jaringan lambat saat pembuatan penjelasan dan pengiriman scan; ketuk dua kali, batalkan, lalu coba manual lagi. | Indikator proses dan pembatalan jelas, tidak ada pengiriman ganda. AI gagal memberi fallback yang sesuai; scan gagal tidak mencatat. Pembatalan penantian klien tidak menjanjikan pembatalan pemrosesan/jatah AI di server. |
| M13 | Putuskan koneksi sebelum membuka jadwal, sebelum konfirmasi, serta sesudah mengirim konfirmasi tetapi sebelum hasil diterima. Sambungkan kembali. | Galat dan pilihan pemulihan terbaca; tidak ada hitungan optimistis, POST otomatis ulang, atau antrean konfirmasi luring. Pada hasil yang belum pasti, periksa jadwal/scan ulang sesuai petunjuk sebelum mencoba kembali. Jangan menyimpulkan sukses dari indikator memuat. |
| M14 | Aktifkan TalkBack/VoiceOver, perbesar teks/zoom, gunakan orientasi potret/lanskap dan navigasi keyboard bila tersedia. | Semua tindakan punya nama, fokus masuk/keluar dialog aman, status tidak hanya warna, teks/data asli tidak terpotong, dan tindakan penting dapat digulir/dijangkau. Ukuran isi minimum 18 px, tombol utama minimum 56 px dan target sentuh minimum 48 px. |
| M15 | Masuk pada dua HP dengan akun yang sama. Ubah/konfirmasi pada HP wali, amati HP lansia. Keluar pada satu HP. | Jadwal mengikuti data server saat polling aktif (20 detik) atau kembali fokus. Keluar lokal tidak mengeluarkan HP lain. Pergantian akun menghilangkan foto/bacaan akun lama. |

## Uji asap AI nyata (opsional)

Tes otomatis tidak memakai Gemini. Setelah environment server uji tersedia, `pnpm --filter backend ai:try-explainer` menjalankan skrip uji asap yang sudah ada dengan teks fiktif; langkah ini memakai jaringan dan jatah AI. Catat model, durasi, keberhasilan pagar keluaran dan pesan gagal. Jangan menempelkan kunci atau isi `.env` dalam hasil. Pembacaan kemasan nyata tetap memerlukan pengujian manual M04/M08 dengan kemasan uji; keberhasilan stub bukan bukti akurasi AI.

## Catatan hasil per skenario

Untuk setiap Mxx, tambahkan: perangkat, **lulus / gagal / belum**, hasil sebenarnya, kondisi jaringan/izin/suara, serta temuan yang dapat diulang. Temuan gagal tetap dicatat sampai diperbaiki dan diuji ulang. Belum ada tanda lulus perangkat pada dokumen ini.
