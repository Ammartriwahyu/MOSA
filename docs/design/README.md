# docs/design

Folder keluaran Claude (dibuat oleh prompt):
- `ORIENTATION.md` (P00): ringkasan pemahaman, konflik antar-sumber, pertanyaan.
- `screen-map.md` (P07): peta frame Figma → rute → fitur → endpoint → status implementasi.
- `screenshots/` (cadangan): tangkapan layar frame bila Figma MCP tidak tersedia.

## Dasbor (P10, row 33)

Dasbor `/` memakai frame MOSA DRAFT 04 (`135:2958`) dan bagian atas 05 (`135:3032`): header, tanggal, keadaan kosong, banner, Scan Obat, dan progres harian. Ikon memakai Lucide yang sudah terpasang; warna dan ukuran memakai token tema. Kalimat pengingat B1 tetap persis; teks isi dan hitungan minimal 18 px.

Tanggal/jam berasal dari `serverTime` dalam WIB. Status, ringkasan harian dan jadwal berikutnya berasal dari API; klien tidak membangkitkan slot atau menghitung jendela dosis. Semua slot yang sudah berstatus jatuh tempo tampil di banner, termasuk slot lintas tanggal; progres tetap memakai ringkasan hari ini dari server.

Selisih yang disengaja: nama keluarga contoh tidak ditanam dalam aplikasi; nama aplikasi tetap TepatMinum (D7). Chip rentang jendela diganti label dan jam jadwal agar tidak menghitung ulang batas dosis di frontend. Progres memakai angka `n dari m` dan bar native, tanpa persentase tambahan. Kalender kosong bersifat informatif. Riwayat menunggu Q3, suara P12, kartu dosis row 34, dan konfirmasi/polling row 35. State memuat, gagal, dan obat aktif tanpa slot hari ini mengikuti komponen yang ada karena tidak ada frame khusus.
