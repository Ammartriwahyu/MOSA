# 08 · Alur Pengguna (User Flow)

# **MAIN FLOW DAN ALTERNATIVE FLOW MOSA**

## **1\. MAIN FLOW (Alur Utama)**

### **A. Login dan Dashboard**

Pengguna membuka aplikasi MOSA, kemudian melakukan login atau registrasi apabila belum memiliki akun. Sistem memvalidasi akun dan mengambil data obat yang telah terdaftar. Setelah berhasil masuk, pengguna diarahkan ke Dashboard.

Dashboard menampilkan daftar obat aktif, jadwal konsumsi harian yang dikelompokkan menjadi pagi, siang, dan malam, status setiap dosis (belum, sudah, atau terlewat), serta progres konsumsi harian. Pengguna juga dapat mengakses fitur Tambah Obat, Scan Obat, dan informasi obat.

### **B. Reminder dan Notifikasi**

Ketika pengguna membuka Dashboard, sistem memeriksa jadwal konsumsi obat berdasarkan waktu saat ini. Apabila waktu jadwal sudah tiba dan dosis belum dikonfirmasi, sistem menampilkan reminder di dalam Dashboard yang mengingatkan pengguna untuk mengonsumsi obat.

Keputusan PM 11 Nov 2026 (Q1): jendela konfirmasi dibuka 30 menit sebelum jadwal. Sebagai contoh, apabila obat dijadwalkan pukul 13.00 WIB, pengguna mulai dapat melakukan konfirmasi pukul 12.30 sampai tepat pukul 15.00 WIB (J+120, inklusif). Selama rentang tersebut, sistem menampilkan dosis sebagai belum dikonfirmasi dan menyediakan pilihan konfirmasi.

Apabila pengguna berhasil mengonfirmasi konsumsi, reminder untuk dosis tersebut tidak lagi ditampilkan sebagai pengingat yang belum diselesaikan. Apabila waktu melewati batas 120 menit tanpa konfirmasi, sistem mengubah status dosis menjadi terlewat.

Reminder pada MVP MOSA hanya berupa in-app reminder ketika aplikasi dibuka, bukan notifikasi push ketika aplikasi tertutup.

### **C. Menambahkan Obat**

Pengguna memilih fitur Tambah Obat, kemudian sistem menampilkan formulir yang berisi nama obat, kekuatan obat, kegunaan, petunjuk penggunaan, jumlah per dosis, jadwal konsumsi, peringatan, dan catatan pribadi.

Pengguna mengisi informasi tersebut serta menentukan sumber informasi, yaitu diisi apoteker atau diisi keluarga.

Setelah formulir dikirim, backend meneruskan informasi obat kepada AI Explanation untuk menghasilkan penjelasan yang lebih mudah dipahami. Sistem kemudian menampilkan hasil penjelasan agar pengguna dapat meninjau sebelum menyimpan.

Apabila penjelasan berhasil dibuat dan telah ditinjau, data obat beserta penjelasannya disimpan ke database. Jika AI Explanation gagal, pengguna tetap dapat menyimpan data obat asli tanpa penjelasan AI.

Setelah berhasil disimpan, obat muncul dalam daftar obat aktif dan jadwal konsumsinya ditampilkan pada Dashboard.

### **D. Melakukan Scan Obat**

Pengguna memilih fitur Scan Obat melalui Dashboard. Pada penggunaan pertama, sistem meminta persetujuan penggunaan kamera. Selanjutnya, pengguna mengambil foto atau mengunggah foto kemasan obat.

Foto diproses oleh AI Vision untuk membaca nama dan kekuatan obat. Hasil pembacaan kemudian dikirim ke backend untuk dicocokkan dengan data obat yang sudah terdaftar pada akun pengguna.

Apabila obat berhasil dicocokkan, backend mengambil informasi obat dan jadwal terkait dari database. Sistem kemudian menampilkan informasi obat kepada pengguna.

Pada scan pertama yang berhasil dicocokkan, sistem meminta pengguna menentukan preferensi output berupa Teks Saja atau Teks \+ Suara Otomatis. Pilihan tersebut disimpan untuk penggunaan scan berikutnya dan dapat diubah melalui halaman informasi obat.

Apabila pengguna memilih Teks \+ Suara Otomatis, sistem menggunakan fitur Text-to-Speech pada browser. Tombol Bacakan tetap tersedia untuk pembacaan manual.

### **E. Konfirmasi Konsumsi Melalui Scan**

Setelah informasi obat ditampilkan, pengguna dapat memilih untuk mengonfirmasi bahwa obat sudah dikonsumsi atau memilih Nanti Dulu.

Apabila pengguna menekan tombol konfirmasi, backend memeriksa kecocokan obat, entri jadwal, waktu konfirmasi, dan status dosis. Jika seluruh kondisi valid, backend menyimpan catatan konsumsi beserta waktu dan metode konfirmasi scan.

Status dosis kemudian berubah menjadi sudah dengan indikator ✓✓. Dashboard dan progres konsumsi harian diperbarui sesuai data terbaru.

Apabila pengguna memilih Nanti Dulu, proses konfirmasi dibatalkan, tidak ada catatan konsumsi yang disimpan, dan status dosis tetap belum. Pengguna harus melakukan scan ulang ketika ingin mengonfirmasi dosis tersebut.

### **F. Konfirmasi Manual Tanpa Scan**

Selain melalui scan, pengguna dapat melakukan konfirmasi secara manual melalui Dashboard. Pengguna memilih dosis yang ingin dikonfirmasi, kemudian menekan tombol Konfirmasi Tanpa Scan.

Sistem meminta persetujuan pengguna. Setelah disetujui, backend memeriksa apakah dosis masih berada dalam rentang waktu konfirmasi dan belum pernah dikonfirmasi sebelumnya.

Jika valid, backend menyimpan catatan konsumsi dengan metode manual. Status dosis berubah menjadi sudah dengan indikator ✓.

### **G. Pembaruan Status dan Riwayat**

Setiap konfirmasi yang berhasil disimpan akan memperbarui status dosis, progres konsumsi harian, dan riwayat konsumsi. Riwayat menyimpan informasi waktu konfirmasi dan metode yang digunakan, yaitu scan atau manual.

Semua perubahan disimpan pada database online sehingga status terbaru dapat ditampilkan pada perangkat lain yang menggunakan akun MOSA yang sama.

---

## **2\. ALTERNATIVE FLOW (Alur Alternatif)**

### **A. Kondisi Scan dan Konfirmasi**

**1\. Scan ulang dosis yang sudah dikonfirmasi melalui scan**

Ketika pengguna melakukan scan ulang terhadap obat yang dosisnya sudah dikonfirmasi melalui scan sebelumnya, sistem mengenali obat dan memeriksa catatan konsumsi pada entri jadwal terkait. Jika ditemukan bahwa dosis sudah dikonfirmasi, sistem menampilkan pemberitahuan bahwa dosis telah dikonfirmasi sebelumnya. Sistem tidak membuat catatan konsumsi baru dan status tetap sudah dengan indikator ✓✓.

**2\. Scan setelah dosis dikonfirmasi manual**

Apabila pengguna sudah melakukan konfirmasi manual kemudian melakukan scan pada obat dan dosis yang sama, sistem mendeteksi bahwa dosis telah dikonfirmasi dengan metode manual. Sistem menampilkan informasi bahwa dosis sudah dikonfirmasi dan tidak mengubah metode konfirmasi. Status tetap sudah dengan indikator ✓.

**3\. Scan berhasil, tetapi pengguna memilih Nanti Dulu**

Setelah scan berhasil mengenali dan mencocokkan obat, sistem menampilkan informasi obat beserta jadwalnya. Pengguna memilih Nanti Dulu sehingga sistem membatalkan proses konfirmasi dan tidak menyimpan catatan konsumsi. Status dosis tetap belum. Apabila ingin melakukan konfirmasi di kemudian waktu, pengguna harus melakukan scan ulang.

**4\. Pengguna melakukan konfirmasi manual tanpa scan**

Pengguna memilih dosis yang sudah memasuki waktu konfirmasi melalui Dashboard, kemudian menekan Konfirmasi Tanpa Scan. Sistem meminta persetujuan dan backend memeriksa waktu serta status dosis. Jika valid, sistem menyimpan catatan konsumsi dengan metode manual dan mengubah status menjadi sudah dengan indikator ✓.

### **B. Kondisi Identifikasi Obat dan Jadwal**

**5\. Obat yang di-scan bukan jadwal obat saat ini**

Pengguna memindai obat yang sudah terdaftar, tetapi obat tersebut belum memiliki jadwal dosis yang dapat dikonfirmasi saat ini. Backend tetap mencocokkan obat dan mengambil informasi dari database. Sistem menampilkan informasi obat serta jadwal berikutnya, tetapi tidak menyediakan tombol konfirmasi karena belum memasuki waktu konsumsi.

**6\. Dua obat berbeda memiliki waktu jadwal yang sama**

Apabila dua obat memiliki jadwal konsumsi yang sama, Dashboard menampilkan keduanya sebagai dosis terpisah. Ketika pengguna melakukan scan salah satu obat, backend mencocokkan hasil scan dengan data obat yang sesuai. Hanya dosis obat yang cocok yang dapat dikonfirmasi, sedangkan obat lainnya tetap berstatus belum sampai dikonfirmasi secara terpisah.

**7\. Dua jadwal obat yang sama bertumpuk**

Apabila satu obat memiliki lebih dari satu entri jadwal yang berpotensi dikonfirmasi pada waktu yang sama, sistem meminta pengguna memilih jadwal dosis yang ingin dikonfirmasi. Backend menggunakan identitas unik setiap entri jadwal untuk memastikan bahwa hanya dosis yang dipilih yang diperbarui menjadi sudah.

**8\. Nama obat cocok, tetapi kekuatannya berbeda**

Ketika nama obat hasil scan cocok dengan obat yang terdaftar tetapi kekuatannya berbeda, backend mendeteksi ketidaksesuaian tersebut. Sebagai contoh, data terdaftar adalah Paracetamol 500 mg, sedangkan hasil scan menunjukkan Paracetamol 650 mg. Sistem menolak pencocokan dan menampilkan pemberitahuan bahwa obat tidak sesuai. Konfirmasi tidak dapat dilanjutkan.

**9\. Obat belum terdaftar**

Apabila AI Vision berhasil membaca nama dan kekuatan obat tetapi backend tidak menemukan obat yang sesuai dalam akun pengguna, sistem menampilkan pemberitahuan bahwa obat belum terdaftar. Pengguna diarahkan ke halaman Tambah Obat untuk mendaftarkan informasi dan jadwal obat terlebih dahulu sebelum dapat menggunakannya untuk proses konfirmasi.

### **C. Kondisi Kegagalan AI dan Scan**

**10\. Foto buram, tanpa kemasan, atau identitas tidak terbaca**

Apabila pengguna mengambil foto yang buram, tidak memperlihatkan kemasan, atau tidak menampilkan identitas obat dengan jelas, AI Vision tidak dapat membaca nama dan kekuatan obat secara meyakinkan. Sistem menampilkan pesan bahwa identitas obat tidak terbaca dan meminta pengguna mengambil foto ulang. Tidak ada catatan konfirmasi yang dibuat selama identitas obat belum berhasil dikenali.

**11\. AI Vision gagal saat scan**

Apabila layanan AI Vision mengalami gangguan atau tidak memberikan hasil yang valid, backend menangani kegagalan tersebut dan sistem menampilkan pemberitahuan bahwa proses scan gagal. Pengguna dapat mencoba melakukan scan kembali. Apabila scan tetap gagal, pengguna masih dapat melakukan konfirmasi manual selama dosis belum melewati batas waktu konfirmasi.

**12\. AI Explanation gagal saat tambah obat**

Ketika AI Explanation gagal menghasilkan penjelasan obat, sistem menampilkan pemberitahuan bahwa penjelasan AI belum tersedia. Pengguna tetap dapat menyimpan data obat asli yang telah diisi tanpa penjelasan AI. Backend menyimpan informasi obat dan jadwal sehingga obat tetap dapat digunakan pada fitur Dashboard dan pengelolaan jadwal.

### **D. Kondisi Dosis Terlewat**

**13\. Dosis sudah terlewat**

Apabila pengguna tidak mengonfirmasi dosis hingga melewati batas 120 menit setelah jadwal, backend mengubah status dosis menjadi terlewat. Dashboard menampilkan status tersebut dan sistem tidak lagi menyediakan tombol konfirmasi untuk dosis yang bersangkutan.

**14\. Scan dilakukan setelah dosis terlewat**

Apabila pengguna melakukan scan terhadap obat yang dosisnya sudah terlewat, AI Vision tetap dapat mengenali identitas obat dan backend mencocokkannya dengan data terdaftar. Namun, sistem menemukan bahwa dosis tersebut sudah melewati batas konfirmasi. Informasi obat tetap dapat ditampilkan, tetapi sistem tidak mengizinkan konfirmasi dan status tetap terlewat.

### **E. Kondisi Beberapa Perangkat dan Pengelolaan Obat**

**15\. Dua perangkat mengonfirmasi dosis yang sama**

Apabila dua perangkat yang menggunakan akun MOSA yang sama mencoba mengonfirmasi satu dosis secara bersamaan, backend memeriksa status dosis sebelum menyimpan catatan konsumsi. Permintaan pertama yang berhasil akan mengubah status menjadi sudah. Ketika perangkat kedua mengirimkan permintaan, backend mendeteksi bahwa dosis telah dikonfirmasi dan menolak penyimpanan duplikat. Kedua perangkat kemudian menampilkan status terbaru yang sama.

**16\. Pengguna mengedit obat yang memiliki riwayat**

Ketika pengguna mengedit obat yang sudah memiliki riwayat konsumsi, sistem menampilkan formulir dengan informasi obat saat ini. Setelah pengguna melakukan perubahan dan menyimpannya, backend memperbarui informasi obat serta jadwal yang berlaku ke depan. Apabila perubahan memengaruhi penjelasan obat, AI menghasilkan penjelasan baru untuk ditinjau pengguna. Riwayat konsumsi sebelumnya tetap dipertahankan dan tidak ikut berubah.

**17\. Pengguna menghapus obat aktif**

Apabila pengguna memilih menghapus obat aktif, sistem menampilkan permintaan konfirmasi penghapusan. Setelah disetujui, backend menonaktifkan obat dan menghentikan jadwal konsumsi berikutnya. Obat tidak lagi muncul dalam daftar obat aktif, tetapi riwayat konsumsi sebelumnya tetap disimpan.

### **F. Kondisi Khusus Jadwal dan Suara**

**18\. Obat baru didaftarkan pada tengah hari**

Apabila pengguna mendaftarkan obat ketika hari sudah berjalan, sistem membandingkan waktu pendaftaran dengan jadwal konsumsi obat. Jadwal yang telah lewat sebelum obat didaftarkan tidak langsung dibuat sebagai dosis terlewat. Sistem hanya membuat jadwal yang masih akan datang pada hari tersebut, sedangkan jadwal hari berikutnya dibuat secara normal.

Sebagai contoh, obat memiliki jadwal pukul 07.00, 13.00, dan 19.00 WIB. Jika obat didaftarkan pukul 15.00 WIB, sistem hanya membuat jadwal pukul 19.00 untuk hari tersebut.

**19\. Jadwal melewati pergantian hari**

Apabila obat memiliki jadwal pukul 23.00 WIB, sistem tetap memperbolehkan konfirmasi hingga 120 menit setelah jadwal, yaitu sampai pukul 01.00 WIB pada tanggal berikutnya. Tepat pukul 01.00 masih termasuk batas konfirmasi. Setelah melewati waktu tersebut, status berubah menjadi terlewat. Sistem tetap menghubungkan konfirmasi dengan tanggal jadwal asal dan menggunakan zona waktu Asia/Jakarta agar perhitungan waktu tetap konsisten.

**20\. Suara bahasa Indonesia tidak tersedia**

Apabila pengguna memilih preferensi Teks \+ Suara Otomatis tetapi browser atau perangkat tidak menyediakan suara bahasa Indonesia, sistem menampilkan penjelasan obat dalam bentuk teks seperti biasa. Sistem juga memberi tahu bahwa suara bahasa Indonesia tidak tersedia. Pengguna tetap dapat membaca informasi obat dan menggunakan fitur MOSA lainnya tanpa terganggu oleh kegagalan Text-to-Speech.

---

Seluruh alur MOSA harus mempertahankan prinsip bahwa AI hanya membantu menjelaskan informasi obat dan mengenali identitas pada kemasan. Backend tetap bertanggung jawab terhadap pencocokan obat, validasi waktu, status dosis, pencegahan konfirmasi ganda, serta pencatatan riwayat konsumsi. Konfirmasi yang tercatat juga tidak dapat dijadikan bukti bahwa obat benar-benar telah ditelan oleh pengguna.

