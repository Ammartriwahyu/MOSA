# docs/design

Folder keluaran Claude (dibuat oleh prompt):
- `ORIENTATION.md` (P00): ringkasan pemahaman, konflik antar-sumber, pertanyaan.
- `screen-map.md` (P07): peta frame Figma → rute → fitur → endpoint → status implementasi.
- `screenshots/` (cadangan): tangkapan layar frame bila Figma MCP tidak tersedia.

## Dasbor (P10, row 33)

Dasbor `/` memakai frame MOSA DRAFT 04 (`135:2958`) dan bagian atas 05 (`135:3032`): header, tanggal, keadaan kosong, banner, Scan Obat, dan progres harian. Ikon memakai Lucide yang sudah terpasang; warna dan ukuran memakai token tema. Kalimat pengingat B1 tetap persis; teks isi dan hitungan minimal 18 px.

Tanggal/jam berasal dari `serverTime` dalam WIB. Status, ringkasan harian dan jadwal berikutnya berasal dari API; klien tidak membangkitkan slot atau menghitung jendela dosis. Semua slot yang sudah berstatus jatuh tempo tampil di banner, termasuk slot lintas tanggal; progres tetap memakai ringkasan hari ini dari server.

Selisih yang disengaja: nama keluarga contoh tidak ditanam dalam aplikasi; nama aplikasi tetap TepatMinum (D7). Chip rentang jendela diganti label dan jam jadwal agar tidak menghitung ulang batas dosis di frontend. Progres memakai angka `n dari m` dan bar native, tanpa persentase tambahan. Kalender kosong bersifat informatif. Riwayat menunggu Q3, suara P12, kartu dosis row 34, dan konfirmasi/polling row 35. State memuat, gagal, dan obat aktif tanpa slot hari ini mengikuti komponen yang ada karena tidak ada frame khusus.

## Kartu dosis (P10, row 34)

Kartu memakai anatomi 05, variasi tanpa scan A7 (`135:5292`) dan terlewat A8 (`135:5506`). Kelompok Pagi/Siang/Malam mengikuti `period` backend; waktu di judul kelompok adalah daftar jam jadwal, bukan rentang jendela konfirmasi. Kartu terurut tanpa menggabungkan dua obat satu jam atau dua slot obat yang sama. Chip progres per obat memakai `medicines[].summary` dari API, bukan hitungan kartu di browser. Label pengisi B2 memakai komponen yang sama dengan daftar/detail obat.

Status memakai ikon + teks + warna. Label Belum dan Sudah mengikuti docs/06; jatuh tempo ditambah Waktunya minum. Terlewat memakai label baku dan keterangan bahwa konfirmasi sudah ditutup. Tidak ada anjuran medis tambahan. Tanda satu/dua centang disertai teks tanpa scan/terverifikasi scan; waktu pencatatan menampilkan tanggal lengkap dalam WIB. Sesuai docs/06, tanpa scan memakai sukses lebih pucat, menggantikan warna biru A7. Ukuran label/status/progres minimal 18 px sehingga kartu lebih tinggi dari Figma.

Prinsip tanggal asal dari B11 (`135:6513`) ditampilkan dalam bagian jadwal hari sebelumnya dan jadwal besok. Ringkasan hari ini tidak ditempelkan ke kartu lintas tanggal. Layar penjelasan B11 tidak menjadi rute baru; batas waktu tetap dihitung backend. Kartu pada row 34 hanya menampilkan data; aksi dosis jatuh tempo dan polling menyusul row 35.

## Konfirmasi dan pembaruan (P10, row 35)

A6 (`135:5029`) memakai Dialog bersama: ikon Check, identitas obat, tanggal/jam slot, kalimat baku #10, Sudah saya minum dan Batal. Batal menggantikan Nanti Dulu pada Figma sesuai D6/PRD. Jadwal terbaru diperiksa saat dialog dibuka; perubahan status atau data obat menonaktifkan konfirmasi snapshot lama. Fokus awal berada pada dialog, kembali ke pemicu saat batal, atau ke judul saat pemicu sudah hilang. Saat POST berlangsung, klik ganda, penutupan, dan aksi lain diblokir. Deskripsi tanpa spasi dapat membungkus dan dialog dapat digulir.

Kartu jatuh tempo mengirim slotId yang dipilih ke scan atau konfirmasi basic. Banner satu dosis langsung membawa slotId; banner beberapa dosis membuka pemilih bergaya Dialog dari B3 (`135:6101`), dengan nama obat dan tanggal/jam eksplisit. Batas jendela tidak dihitung ulang di klien. Pemilih membaca daftar terbaru dan tidak memilihkan slot otomatis. Semua tautan slot di-URL-encode sekali; navigasi bawah tetap scan generik.

Polling memakai satu konstanta 20 detik, berhenti di latar, dan refetch saat kembali fokus. Kartu tidak diganti skeleton saat refetch biasa. Sesudah POST sukses/409, GET lama dibatalkan dan data dimuat ulang; tidak ada kenaikan hitungan optimistis. Tanda terima basic bergaya notice A7 hanya muncul setelah respons server sah; 409 memakai pesan netral dan level terbaru dari GET. Kesalahan jaringan/timeout/respons invalid memerlukan Periksa jadwal sebelum percobaan baru. Tidak ada antrean mutasi offline.

Pratinjau browser 360/390/430 px memakai Hono/use case asli dengan repository in-memory, Clock tetap dan data fiktif. Batal mempertahankan 0/2; POST basic menghasilkan 1/2 dan menghapus aksi dosis tercatat. Pemilih menampilkan slot 07.00/08.00 terpisah. Ini tidak memverifikasi Supabase/Auth nyata. Halaman/server pratinjau serta env publik fiktif hanya digunakan selama pengujian dan tidak disimpan dalam jalur produksi.

## Persetujuan dan capture scan (P11, row 36)

Frame 06 (`135:3274`), 07 (`135:3544`), 13 (`135:3962`) dan B9 (`135:6418`) diambil sekali pada 12 Nov. Consent memakai Dialog bersama, ShieldCheck 40 px pada lingkar info 80 px, panel biru berisi #2 persis, tips Check/X, Saya mengerti lanjut dan Batal. Tombol 60 px dan teks isi minimal 18 px. Catatan per HP diletakkan sebelum tombol agar terbaca sebelum menyetujui, bukan setelah Batal seperti Figma. Opsi Dialog untuk melepas padding judul hanya dipakai ketika ikon besar sudah menjauhkan judul dari tombol tutup; judul layar lain tetap memakai padding semula.

Capture mengikuti latar kamera gelap 07/13, bingkai hijau, shutter 88 px serta pemilih unggah; pratinjau B9 memakai frame putih dan foto dinamis. Ikon Lucide yang sama dengan sumber Figma dipakai ulang, tanpa unduhan gambar baru. Contoh AMLODIPINE pada desain adalah slot foto pengguna, tidak ditanam sebagai kemasan sungguhan atau kamera yang sudah aktif. Sebelum foto dipilih, area itu menampilkan ikon kamera dan petunjuk. Native input file yang membuka kamera/pemilih, bukan getUserMedia. Tidak ada status bar iPhone buatan.

Selisih disengaja: dialog muncul pada rute scan dengan capture terkunci, sehingga tautan langsung terlindungi tanpa menggambar dasbor palsu. Mode generik bertuliskan Scan kemasan obat karena backend dapat menemukan dosis yang jatuh tempo; tidak menjanjikan selalu lihat info. Mode spesifik menampilkan tanggal/jam target, tanpa menebak nama obat dari ID atau menghitung status dosis. Target rusak tidak dialihkan ke scan generik. Foto menggunakan URL Blob sementara; nama berkas tidak ditampilkan. Capture/pratinjau tidak memakai navigasi bawah sesuai alur kamera, dan tombol Gunakan Foto Ini menunggu pengiriman nyata row 37. Bukan tombol palsu atau pengiriman otomatis.

Pemeriksaan browser pada CSS viewport 360/390/430 px: tidak ada luapan horizontal, tombol utama 60 px/tutup 48 px, judul consent tetap muat, fokus kembali ke judul setelah dialog. Ikon tutup awalnya putih di atas latar putih akibat kelas dasar IconLink; override latar memakai token transparan kamera memperbaikinya. Pola canvas sintetis 3200×2000 dikompres sungguhan menjadi JPEG 1600×1000, 191.057→42.465 byte; bukan uji akurasi/EXIF/foto obat nyata. Konsol bersih. HP nyata dan alur Supabase/Auth belum diuji. Teks tambahan `SCAN_CAPTURE` dan `jadwalTargetScan` DRAFT; #2 serta Batal/Scan Obat baku tidak berubah.

## Pengiriman scan (P11, row 37)

Frame 08 (`135:3590`) dan 14 (`135:4007`) diambil sekali pada 12 Nov: latar kamera, Camera 60 px di lingkar 152 px dengan border hijau 8 px, judul 26 px, teks tunggu 18 px dan tiga titik hijau 14 px. Ikon Lucide/token yang sudah ada dipakai ulang; animasi titik menghormati reduced motion. Batal 60 px beserta penjelasan efek pembatalan ditambahkan sesuai P11; tidak menjanjikan membatalkan pemrosesan atau mengembalikan jatah server. Heading mendapat fokus saat loading, galat, tanda terima atau kembali ke capture; tidak ada status bar HP buatan.

Gunakan Foto Ini baru aktif sesudah foto siap dan hanya mengirim setelah diketuk. Saat pengiriman dimulai, URL pratinjau dilepas; Blob/base64/token tidak masuk query/mutation cache. Timeout total 25 detik, ganti akun/target, unmount dan Batal membatalkan transport serta menolak hasil lama. UI galat memakai ErrorState bersama; kalimat #12 persis. Hasil terstruktur hanya ditahan dalam state lokal: tanda terima netral tidak menyatakan obat cocok atau dosis tercatat. Tampilan delapan hasil dan konfirmasi tetap row 38–39.

Browser 360/390/430 px tanpa luapan horizontal; Batal 60 px. Pengiriman JPEG sintetis melalui HTTP berhasil, respons setelah batal diabaikan, kuota habis menampilkan #12, dan tidak ada pencatatan dosis. Backend nyata memakai Auth/AI/penyimpanan fiktif untuk pemeriksaan ini; Supabase/Auth/Gemini/perangkat nyata belum diuji. Pratinjau sementara dihapus dan server dihentikan. Teks `SCAN_REQUEST` DRAFT; #2/#12 dan Batal tetap baku.

## Delapan hasil scan (P11, row 38)

Konteks dan screenshot 10 (`135:3612`), 15 (`135:4029`), A1–A4 (`135:4767`, `135:4821`, `135:4867`, `135:4921`) dan B1 (`135:6020`) diambil sekali pada 12 Nov. Hasil memakai header kembali 48 px, lingkar status 96 px/ikon 48 px (Check hasil cocok 52 px), judul 26–28 px, panel pesan bergaris 3 px, serta tombol 60 px. Ikon Lucide yang sama dipakai ulang. Card menambah tone brand untuk panel jadwal berikutnya hijau muda, tanpa konflik kelas latar putih bawaan. Tidak ada aset gambar tambahan atau status bar HP buatan.

Kalimat baku mengalahkan teks desain: A1 memakai #9; A2 memakai #8 tanpa menampilkan nama bacaan AI atau mengisi formulir Tambah Obat otomatis; A3 memakai #7 tanpa tambahan nasihat "Jangan diminum dulu"; A4 memakai #6 dan seluruh obat jatuh tempo dari server. Bila nextDose null, varian DRAFT tanpa jam menghindari tebakan. Kekuatan belum terbaca tidak punya frame khusus: memakai pola peringatan A1 dan D-b. B1/B2 ditampilkan netral sebagai sudah tercatat, tanpa menebak metode atau waktu pencatatan yang tidak dikirim API. Jadwal besok/lintas tanggal selalu punya tanggal eksplisit; UI tidak menghitung status dosis.

Slot bertumpuk memakai ChoiceCards bersama tanpa pilihan awal; pesan #4 muncul untuk satu slot yang dipilih. Pemilihan tidak menyimpan dosis. Tombol Lanjut/konfirmasi menyusul row 39; Bacakan/Pilihan Teks-Suara menyusul integrasi berikutnya, sehingga tidak ada tombol tanpa aksi. Tidak memakai navigasi bawah pada rute flow. Informasi memakai ulang identitas, penjelasan dan data asli Detail Obat melalui antarmuka publik medicines; jam minum lengkap tidak diada-adakan dari snapshot scan. Pengguna dapat membuka informasi dan kembali tanpa membuang hasil/pilihan.

Browser memeriksa delapan hasil pada 360/390/430 px dan pemilih bertumpuk/fokus/kembali. Nama tanpa spasi awalnya meluap (scrollWidth 2779/3531 px); overflow-wrap:anywhere dan pembatasan lebar judul identitas memperbaikinya, pengukuran ulang sama dengan clientWidth pada semua ukuran. Konsol bersih; bukti lokal scan-outcomes-info.png dan scan-outcomes-warning.png. Pratinjau data fiktif dihapus, server dihentikan dan viewport direset. Ini pemeriksaan tampilan, bukan uji Supabase/Gemini atau HP nyata. Teks SCAN_OUTCOME dan tungguDuluTanpaJadwal DRAFT; #3/#4/#6/#7/#8/#9 tetap persis ketika datanya tersedia.

## Konfirmasi scan (P11, row 39)

Frame 11 (`135:3667`) diambil sekali pada 12 Nov. Dialog bersama mempertahankan lembar putih radius 28 px, overlay, Pill 40 px pada lingkar 80 px, identitas obat, kalimat baku #5, Check 24 px pada tombol hijau 60 px serta Nanti dulu 60 px. Info 24 px memakai opsi ikon pada Notice bersama. Kalimat baku memakai huruf kecil "dulu", menggantikan kapitalisasi desain. Catatan penjelas DRAFT berbunyi kondisional agar tidak mengklaim ✓✓ sebelum server menyimpan. Tanggal asal slot dan jumlah/aturan pakai ditambahkan untuk membedakan jadwal bertumpuk atau lintas tanggal. Teks isi dinaikkan menjadi 18 px; dialog lebih tinggi dan bisa digulir. Bacakan tetap P12, tanpa tombol palsu.

Lanjut hanya tersedia pada hasil bisa_konfirmasi dan slot yang dipilih. Dialog memeriksa jadwal segar sebelum mengaktifkan Sudah saya minum. Nanti dulu/Esc/Tutup sebelum POST kembali ke jadwal dan membuang hasil; selama POST semuanya dikunci. Token hanya di memori/body POST; receipt ketat menunjukkan ✓✓ setelah sukses. Konflik/tidak pasti tidak menebak metode pencatatan. Expiry dihitung dari metadata token server dan elapsed monoton, termasuk saat pilihan output pertama; backend memeriksa ulang saat simpan. Pilihan Tampilan pertama memakai formulir preferensi yang sama secara lokal agar token tidak hilang ketika berpindah rute; fokus berpindah ke judul lalu hasil.

Browser HTTP: JPEG sintetis → Hono/use case/HMAC → penyimpanan fiktif. Nanti dulu 0 POST/0 catatan; konfirmasi 1 POST/1 catatan; GET dasbor menampilkan Sudah 1 dari 2 dosis dan status terverifikasi scan. Setelah Clock server dimajukan 6 menit, token ditolak 403, tombol konfirmasi mati dan Scan ulang tersedia, catatan tetap 0. Dialog normal dan nama panjang tanpa spasi lolos 360/390/430 px, aksi 60/tutup 48 px, fokus awal dialog; tidak ada luapan di produk. Luapan output JSON alat pratinjau diperbaiki hanya pada alat tersebut. Konsol bersih. Bukti lokal scan-confirm-dialog.png dan scan-confirm-success.png. Semua berkas/server pratinjau dihapus/dihentikan, viewport direset dan tab uji ditutup; belum Supabase/Auth/Gemini atau HP nyata. SCAN_CONFIRM DRAFT; #5 dan tombol baku tidak diubah.
