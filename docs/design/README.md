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
