# PWA dan pengingat di HP ini

13 November 2026 · P14 dibuka kembali atas permintaan PM. Frontend menyediakan manifest/ikon, worker dan Pengaturan untuk izin/langganan. Pengiriman provider, pemasangan Android/iOS, migrasi layanan dan cron live **belum diuji atau diaktifkan**.

## Persiapan operator

1. Ikuti [konfigurasi backend push](web-push-backend.md), termasuk keenam migrasi, CRON_SECRET dan pasangan VAPID yang sama. Jangan mengaktifkan cron sebelum pengujian perangkat selesai.
2. Isi **hanya public key** pada NEXT_PUBLIC_VAPID_PUBLIC_KEY frontend. Private key dan CRON_SECRET tetap di backend. Nilai kosong/tidak valid menampilkan pengingat belum tersedia; fitur MVP dan petunjuk pemasangan tetap dapat dipakai.
3. Build ulang frontend setelah nilai publik berubah. Worker dibangkitkan oleh skrip dev/build; `pnpm typecheck` memeriksa bahwa public/sw.js cocok dengan sumber copy/template. Jalankan `node frontend/scripts/generate-service-worker.mjs` dari akar repo bila mengedit copy/template.
4. Gunakan HTTPS untuk perangkat. Localhost pada mesin yang sama adalah konteks aman; alamat HTTP LAN pada HP berbeda tidak dianggap setara. Jangan melewati peringatan sertifikat browser.

Manifest [Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) tersedia pada /manifest.webmanifest: standalone, scope/start_url akar, ikon PNG 192/512 dan Apple touch 180. Badge notifikasi berlatar transparan. Public/sw.js disajikan dengan no-store dan scope akar. Registrasi worker tidak meminta izin notifikasi dan tidak berlangganan push dengan sendirinya.

## Alur pengguna

- Buka Pengaturan → Pengingat di HP ini. Setelah platform dan sesi diperiksa, tombol Aktifkan pengingat memanggil permintaan izin langsung dari klik, sebelum menunggu proses lain ([PushManager/MDN](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)). Tidak ada prompt otomatis saat mount/login.
- Bila izin diberikan, browser membuat langganan lalu frontend menyimpannya melalui API backend memakai token akun yang ditangkap khusus operasi tersebut. Status aktif hanya muncul sesudah penyimpanan/flag lokal berhasil. Klik ganda dikunci; kegagalan mencoba mencabut endpoint dan menghapus marker, tanpa mengklaim berhasil.
- Penolakan izin menampilkan petunjuk pengaturan browser/HP dan tombol Periksa lagi. Menekan Periksa lagi hanya memeriksa, tidak meminta izin baru. Tidak ada retry mutasi otomatis.
- Matikan pengingat mencabut langganan browser, menutup notifikasi milik aplikasi dan menghapus flag/marker. API DELETE selalu scoped akun; galat jaringan ditampilkan bila pembersihan tidak lengkap. Keluar akun tetap dapat selesai saat offline.
- Di iPhone/iPad, buka di Safari → Bagikan → Tambahkan ke Layar Utama, lalu buka dari ikon tersebut. Web Push iOS memerlukan aplikasi Home Screen dan izin dari tindakan pengguna ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)); petunjuk bukan bukti dukungan/perangkat berhasil diuji.
- Tombol Pasang aplikasi hanya muncul bila browser menawarkan beforeinstallprompt, dan memanggil prompt hanya setelah klik. Browser lain mendapat petunjuk menu. Pemasangan tidak memberi izin notifikasi secara otomatis.

## Data dan pergantian akun

Worker tidak menangani fetch/sync: tidak menyimpan foto, data obat, token, halaman akun maupun respons API untuk offline. PWA tetap memerlukan internet untuk layanan; pemasangan tidak membuat alur offline.

CacheStorage hanya memuat flag `1` untuk izin aplikasi menampilkan push; mematikan pengingat menghapus flag. LocalStorage menyimpan marker pemilik berupa ID akun saja, tanpa token/endpoint/kunci tambahan. Ini dipakai agar langganan lama tidak diadopsi oleh akun lain setelah reload. Cache/penyimpanan yang gagal tidak menghasilkan status aktif palsu.

Logout mematikan flag sebelum mencabut langganan dan sebelum signOut Supabase. Pergantian sesi/tab memeriksa marker dan membatalkan operasi lama. API memakai token yang ditangkap sebelum pergantian, sehingga cleanup akun lama tidak memakai token akun baru. Pembatalan/timeout tidak dapat membatalkan operasi native yang sudah berjalan; endpoint yang muncul terlambat tetap tidak didaftarkan ulang otomatis dan pemeriksaan berikutnya membersihkan marker yang tidak cocok.

Notifikasi yang sudah terlihat ditutup saat cleanup. Worker menolak menampilkan push bila flag hilang/tidak dapat dibaca. Browser yang tidak bisa menyimpan perubahan izin tetap dapat memerlukan pencabutan melalui pengaturan OS/browser; kegagalan tidak disembunyikan sebagai keberhasilan aktivasi.

## Isi dan klik notifikasi

Judul/badan bersifat netral, berasal dari PUSH di copy.ts dan dibenamkan ke worker oleh generator. Ada **21 teks DRAFT** baru pada [daftar copy](02-copywriting-baku.md), termasuk izin, pemasangan, status dan galat; tidak ada nama/kekuatan/instruksi obat di layar kunci.

Payload backend `{type:"dose_due",slotId}` divalidasi format/tanggalnya. Klik membuka URL origin aplikasi `/scan?dosis=<slotId>` yang di-encode; URL/judul/badan dari payload tidak dipercaya. Payload rusak menghasilkan pesan netral dan membuka jadwal. Jendela aplikasi yang sudah ada dipakai kembali bila memungkinkan. Halaman scan tetap memakai Auth/consent/status server; push/klik tidak pernah mencatat minum atau mengubah hitungan.

Pengiriman tetap best-effort dengan semantik klaim dan TTL=0 dari backend: perangkat offline dapat kehilangan pengingat. Status aktif di Pengaturan adalah konfigurasi lokal yang tersimpan, bukan bukti kiriman provider atau jaminan tepat waktu. Tetap periksa dashboard.

## Verifikasi yang perlu dijalankan di perangkat

Catat OS/browser, commit, URL dan waktu WIB pada [checklist manual](manual-test-checklist.md), M16–M19. Gunakan akun/data fiktif dan target layanan yang disetujui:

1. Pasang dan buka aplikasi di Android Chrome/iPhone Home Screen. Tolak izin, periksa pesan, kemudian ubah izin melalui browser/OS dan aktifkan dengan klik.
2. Pastikan langganan tersimpan pada household akun tersebut. Picu cron memakai secret target, lalu ulangi request: satu notifikasi per slot/perangkat, bukan satu per request cron.
3. Pastikan layar kunci netral; klik membuka scan target dan tetap meminta pemeriksaan/konfirmasi sah. Uji slot yang sudah tercatat/diubah/terlewat sebelum klik: tidak boleh otomatis dikonfirmasi.
4. Matikan pengingat, logout, ganti akun dan ulangi dari tab lain. Pastikan endpoint lama dicabut/flag mati, notifikasi terlihat ditutup dan operasi tertunda tidak mengaktifkan akun baru.
5. Uji backend/offline/penyimpanan terblokir dan kuota, serta izin yang dicabut dari OS. Jangan menandai Lulus hanya dari suite tiruan atau pratinjau.

## Bukti pengembangan

Tes menguji worker terbangun dalam VM, native API/Auth/transport tiruan, manifest/ukuran ikon, pengaturan dan axe. Pratinjau tanpa public key pada 360/390/430 px tidak meluap, teks isi 18 px dan tidak ada console error; ini bukan pengujian izin/push native. Halaman pratinjau sementara dihapus.

Cache dev sempat memuat tipe rute pratinjau yang sudah dihapus. Penghapusan cache langsung ditolak pemeriksaan otomatis (blocked by policy); startup ulang Next.js memperbarui tipe dev, lalu tsc lulus. Tidak melonggarkan lint/tipe atau mempertahankan rute pratinjau untuk menutupi masalah.

Verifikasi akhir: typecheck kedua paket lulus (6,73 dtk), lint termasuk 48 probe batas impor lulus (26,82 dtk); satu warning ref dibetulkan dan ESLint berkas terkait diperiksa ulang tanpa warning. Suite penuh lulus **743 backend/50 berkas + 589 frontend/53 berkas** (67,83 dtk). Build produksi frontend lulus (19,70 dtk) memakai konfigurasi publik fiktif tanpa key push; bukan bukti koneksi layanan. Sebanyak 110 tes terarah dan sembilan regresi panel setelah perbaikan lint lulus. Pemeriksaan 45 tautan lokal/empat anchor dan diff check lulus.

Generator Node 24 menampilkan warning MODULE_TYPELESS_PACKAGE_JSON saat memuat copy.ts sebagai modul; bukan kegagalan build dan tidak mengubah tipe package frontend. Axe pada jsdom juga melaporkan canvas tidak tersedia; tidak ada pelanggaran axe pada panel, sementara kontras/tampilan tetap memerlukan pemeriksaan perangkat. Tidak memasang dependensi tambahan untuk membungkam warning.

Pengujian perangkat/provider dan pengiriman nyata masih belum dilakukan; tidak ada URL produksi, secret atau jadwal cron baru pada branch ini. Checklist M16–M19 tetap Belum, demikian juga bukti layanan/perangkat pada enam AC MVP yang masih terbuka.
