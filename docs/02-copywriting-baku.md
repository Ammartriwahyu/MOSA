# 02 · Kalimat Baku Antarmuka

Sumber: PRD §10 (nomor di bawah = nomor baris tabel PRD §10), §9.3, §9.4, §19 #12. **Salin persis, termasuk tanda baca dan huruf besar/kecil.** Jangan memparafrase, memperhalus, atau menerjemahkan. Bila ingin mengubah satu kalimat, berhenti dan tanyakan ke PM.

## Aturan implementasi
- Semua teks ada di **satu berkas** `frontend/src/shared/copy/copy.ts` (dan `copy.test.ts` yang menguji setiap templat). Komponen tidak boleh menulis kalimat baku sendiri.
- Templat memakai fungsi bertipe, misalnya `verifikasiBenar({ nama, kekuatan, jam, jumlah, aturan })`.
- Jam ditulis dengan titik: `07.00`, `19.00`. Kekuatan ditulis dengan spasi: `5 mg`.
- Backend mengirim data terstruktur; frontend merakit kalimat. Teks yang dibacakan suara = teks yang tampil.

## Kalimat

| No | Situasi | Teks | Tombol |
|---|---|---|---|
| 1 | Pop-up konfirmasi simpan obat | `Periksa sekali lagi, ya. Pastikan nama obat, dosis, dan jadwal di bawah ini sudah sesuai resep. Informasi ini akan menjadi panduan minum obat setiap hari.` | `Ya, sudah benar` / `Perbaiki lagi` |
| 2 | Persetujuan sebelum scan pertama | `Foto obat akan dikirim ke layanan AI untuk dibaca. Foto tidak kami simpan. Hindari memotret bagian yang berisi nama atau data pribadi.` | (tombol setuju/lanjut: teks bebas, ringkas) |
| 3 | Scan lihat info, cocok (jadwal berikutnya) | `Obat ini perlu diminum lagi malam ini pukul 19.00.` | `Bacakan` |
| 4 | Scan verifikasi, hasil benar | `Obat sudah sesuai. Ini [Nama Obat] [Kekuatan] untuk jadwal pukul [Jam]. Minum [Jumlah per minum] [Aturan pakai].` Contoh: `Obat sudah sesuai. Ini Amlodipin 5 mg untuk jadwal pukul 07.00. Minum 1 tablet sesudah makan.` | |
| 5 | Pop-up konfirmasi minum | `Apakah obat ini sudah diminum?` | `Sudah saya minum` / `Nanti dulu` |
| 6 | Salah obat / bukan jadwal sekarang | `Tunggu dulu. Ini Metformin 500 mg untuk jadwal pukul 19.00. Obat untuk sekarang adalah Amlodipin 5 mg.` (nama, kekuatan, jam dari data; bila lebih dari satu obat jatuh tempo, pisahkan dengan " dan ") | |
| 7 | Nama sama, kekuatan beda | `Hati-hati. Obat ini Amlodipin 10 mg, sedangkan yang terdaftar Amlodipin 5 mg. Tanyakan ke apoteker sebelum diminum.` | |
| 8 | Obat belum terdaftar | `Obat ini belum ada di daftar Anda. Minta apoteker atau keluarga untuk mendaftarkannya.` | |
| 9 | Foto tanpa kemasan / nama tidak terlihat | `Nama obatnya belum terlihat. Coba foto bungkus atau plastik obatnya, bagian yang ada tulisan namanya.` | |
| 10 | "Sudah minum tanpa scan" | `Anda mencatat obat ini tanpa foto kemasan. Apakah obat [Nama Obat] [Kekuatan] benar sudah diminum?` | `Sudah saya minum` / `Batal` [REKOMENDASI PM; lihat D6] |
| 11 | Dosis terlewat | Tidak ada kalimat baku. Pakai label status `Terlewat`. | |
| 12 | AI gagal / kuota habis | `Maaf, pembaca foto obat sedang istirahat sebentar. Silakan coba foto lagi nanti, atau lihat jadwal dan catat minum obat langsung dari halaman utama.` [REKOMENDASI PM] | |

## Kalimat tambahan dari PRD
| Kode | Situasi | Teks |
|---|---|---|
| B1 | Banner pengingat dosis jatuh tempo (PRD §9.3) | `Sekarang waktunya minum [Nama Obat].` Contoh: `Sekarang waktunya minum Amlodipin.` |
| B2 | Pilihan label sumber | `Diisi apoteker` / `Diisi keluarga` |
| B3 | Tombol utama dashboard | `Scan Obat` |
| B4 | Tombol suara | `Bacakan` |
| B5 | Label kolom kegunaan | `Kegunaan Obat` |
| B6 | Kalimat pitching (PRD §12.3), untuk halaman "Tentang" bila dibuat | `Untuk prototipe lomba, kami memakai layanan AI tier gratis dengan data uji tanpa identitas pengguna: foto tidak disimpan dan pengguna diberi tahu sebelum memakai fitur scan. Pada versi produksi, kami beralih ke layanan AI berbayar yang tidak memakai data pengguna untuk melatih model, dengan biaya yang ditutup melalui partnership dan iklan.` |

## Kalimat yang BELUM ada di PRD (draf; jangan dianggap baku)
Tandai di kode dengan komentar `// DRAFT: belum disetujui tim` dan kumpulkan di `copy.ts` bagian `DRAFT`. Daftarkan dalam laporan akhir tiap prompt agar PM bisa menyetujuinya.

| Kode | Situasi | Draf |
|---|---|---|
| D-a | Dosis sudah tercatat saat scan | `Dosis [Nama Obat] pukul [Jam] sudah tercatat diminum. Dosis berikutnya pukul [Jam berikutnya].` / bila tidak ada lagi: `Tidak ada dosis berikutnya hari ini.` |
| D-b | Kekuatan tidak terbaca | `Kekuatan obatnya belum terlihat. Coba foto lagi, bagian yang ada tulisan kekuatannya.` |
| D-c | AI gagal saat simpan obat | `Penjelasan sederhana belum tersedia.` (data tetap bisa disimpan dengan teks pengisi) |
| D-d | Suara bahasa Indonesia tidak tersedia | `Suara bahasa Indonesia belum tersedia di HP ini. Teks tetap bisa dibaca di layar.` |
| D-e | Obat belum waktunya, scan sekadar info | Pakai kalimat #3 saja. |
| D-f | Tombol persetujuan data saat daftar | `Saya setuju data obat saya disimpan di aplikasi ini.` |
| D-g | Hapus per obat / hapus semua | Teks konfirmasi singkat: sebutkan apa yang dihapus dan bahwa tidak bisa dibatalkan. |

## Penyusunan kalimat "jadwal berikutnya" (kalimat #3)
Backend mengirim `nextDose = { tanggal: 'hari_ini' | 'besok', kelompok: 'pagi' | 'siang' | 'malam', jam: 'HH:mm' }` atau `null`. Frontend merakit: `Obat ini perlu diminum lagi [kelompok] [ini/besok] pukul [jam].` dengan pemetaan: hari_ini + malam → `malam ini`; hari_ini + pagi → `pagi ini`; besok + pagi → `besok pagi`; dan seterusnya. Bila `nextDose = null`: `Tidak ada jadwal minum berikutnya untuk obat ini.` (DRAFT). Uji semua kombinasi.


## P14 · Pengingat dan PWA (DRAFT, 13 November 2026)

Teks baru untuk izin sukarela di HP ini, pemasangan, status/galat dan notifikasi layar kunci. Belum mendapat persetujuan PM untuk redaksi; semua berasal dari PUSH di copy.ts. Notifikasi tidak berisi nama, kekuatan atau instruksi obat.

| Kunci PUSH | Teks DRAFT |
|---|---|
| heading | Pengingat di HP ini |
| explanation | Izinkan notifikasi agar HP ini dapat menerima pengingat. Pengingat bisa terlambat atau tidak muncul. Tetap periksa jadwal di aplikasi. |
| enable | Aktifkan pengingat |
| disable | Matikan pengingat |
| enabled | Pengingat aktif di HP ini. |
| disabled | Pengingat tidak aktif di HP ini. |
| preparing | Menyiapkan pengingat… |
| busy | Menyimpan pilihan pengingat… |
| denied | Izin notifikasi ditolak. Jika ingin mengaktifkannya, ubah izin situs ini melalui pengaturan browser atau HP, lalu coba lagi. |
| unsupported | Browser ini belum mendukung pengingat. Anda tetap dapat melihat jadwal di aplikasi. |
| unavailable | Pengingat belum tersedia. Anda tetap dapat melihat jadwal di aplikasi. |
| failed | Pilihan pengingat belum tersimpan. Periksa koneksi, lalu coba lagi. |
| cancelled | Pilihan pengingat berubah. Periksa kembali pengaturan di HP ini. |
| retry | Periksa lagi |
| installHeading | Pasang di layar utama |
| install | Pasang aplikasi |
| installed | Aplikasi sudah dibuka dari layar utama. |
| installHint | Gunakan pilihan Pasang aplikasi atau Tambahkan ke layar utama pada menu browser. Aplikasi tetap memerlukan internet. |
| iosHint | Di iPhone atau iPad, buka aplikasi ini di Safari, pilih Bagikan, lalu Tambahkan ke Layar Utama. Buka dari layar utama untuk mengaktifkan pengingat. |
| notificationTitle | Pengingat MOSA |
| notificationBody | Buka aplikasi untuk memeriksa jadwal Anda. |
