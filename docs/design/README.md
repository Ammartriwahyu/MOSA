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
