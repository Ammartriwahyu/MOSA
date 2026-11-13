# Backend Web Push · P14

13 November 2026: PM meminta Web Push/PWA sehingga P14 dibuka kembali. Branch backend menyediakan API dan pengiriman; manifest, service worker, izin dan UI langganan dikerjakan pada branch frontend berikutnya. Belum ada pengiriman ke perangkat, migrasi layanan, deploy atau cron yang diaktifkan.

## Konfigurasi opsional

`PUSH_ENABLED=false` adalah bawaan. MVP tetap dapat dimulai dengan konfigurasi lama. API push/cron menjawab 503 PUSH_UNAVAILABLE bila belum aktif; endpoint MVP tidak bergantung pada keberhasilan pengiriman.

Sebelum aktivasi pada target yang disetujui:

1. Terapkan keenam migrasi berurutan, termasuk 20261113120000_push_reminder_claims.sql. Tabel push/dispatch sudah ada pada skema awal; migrasi baru menambah RPC khusus server tanpa membuka RLS.
2. Buat pasangan kunci lokal dengan `pnpm --filter backend push:keys`. Skrip menulis backend/.env.push-keys secara eksklusif dan tidak mencetak private key; berkas di-ignore dan tidak ditimpa bila sudah ada. Pindahkan nilai melalui pengelola rahasia operator, bukan log/chat/git.
3. Isi VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto kontak tim atau HTTPS) dan CRON_SECRET acak minimal 32 karakter hanya di backend. Aktifkan PUSH_ENABLED=true setelah semua nilai siap. Konfigurasi tidak valid gagal cepat hanya menyebut nama variabel.
4. Pada frontend berikutnya, hanya public key VAPID yang boleh menjadi NEXT_PUBLIC_VAPID_PUBLIC_KEY. Private key dan CRON_SECRET tetap di server. Frontend/worker belum tersedia pada branch backend ini.

Pustaka [web-push](https://github.com/web-push-libs/web-push) 4.0.0 dipakai untuk enkripsi Web Push dan VAPID, dengan @types/web-push 3.6.4. API named exports diperiksa pada versi terpasang; tes memakai generateRequestDetails asli untuk membuktikan enkripsi aes128gcm/header VAPID tanpa menghubungi jaringan.

## Kontrak HTTP

| Rute | Perlindungan | Body/hasil |
|---|---|---|
| POST /v1/push/subscriptions | Bearer tervalidasi + consent data | `{endpoint, keys:{p256dh,auth}, expirationTime?:number|null}`; 204 |
| DELETE /v1/push/subscriptions | Bearer tervalidasi + consent data | `{endpoint}`; 204, idempoten dan scoped ke household sesi |
| POST /v1/internal/reminders/run | Hanya x-cron-secret, perbandingan digest waktu konstan | Tidak perlu body/token pengguna; hasil `{sent,expired,failed,skipped}` |

Identitas household tidak diterima dari body/query. Body subscription dibatasi 8 KiB. Endpoint tidak dapat dipindahkan ke household lain; maksimal sepuluh langganan per household, dihitung atomik pada registrasi. Untuk berganti akun di browser, frontend harus melepas langganan lama lalu membuat langganan baru.

Endpoint HTTPS hanya untuk fcm.googleapis.com, updates.push.services.mozilla.com dan satu subdomain push.apple.com; tanpa kredensial URL, port nonstandar atau fragment. Ini membatasi server agar tidak menjadi proxy URL pengguna; provider lain perlu ditinjau dahulu. Sumber host: [Google](https://firebase.google.com/docs/cloud-messaging/network-configuration), [Mozilla](https://mozilla-services.github.io/autopush-rs/http.html), [Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

Rute cron dipasang khusus untuk POST/path persis sebelum middleware sesi. Rute internal lain tetap memerlukan sesi; token pengguna tidak menggantikan secret cron. Secret/endpoint/kunci/payload tidak dicatat pada log atau respons galat.

## Semantik pengiriman

- Dosis diambil melalui ListTodaysDoses dari modul dosing: klasifikasi yang sama, J−30/J+120 inklusif, slot bertumpuk, lintas hari, Q5 dan konfirmasi tetap berlaku. Akun tanpa consent tidak dikirimi.
- Sebelum tiap perangkat diproses, status dibaca lagi. RPC klaim memeriksa household/perangkat/obat aktif, jadwal masih ada dan waktu aktifnya, consent serta konfirmasi yang sudah tercatat.
- Klaim atomik memakai kunci `(medicine,date,time,kind)` dengan kind `push:<subscriptionId>`. Dua perangkat boleh menerima satu pengingat masing-masing; cron berulang/bersamaan tidak mengulang slot pada langganan yang sama. Menghapus/membuat langganan menghasilkan identitas baru.
- Klaim dibuat **sebelum** request ke provider. Ini at-most-once untuk percobaan kirim: timeout, kegagalan atau crash sesudah klaim dapat kehilangan pengingat, bukan diulang dengan hasil jaringan yang tidak diketahui. sent_at pada tabel lama menandai waktu klaim; bukan bukti notifikasi tampil atau dosis diminum. Tidak ada janji exactly-once delivery.
- Request memakai TTL=0 agar layanan tidak mengantre pesan untuk perangkat offline; socket timeout 5 detik, tanpa retry otomatis. Dukungan TTL/timeout berasal dari [opsi web-push](https://github.com/web-push-libs/web-push#sendnotificationpushsubscription-payload-options). Pengiriman tetap best-effort dan tidak menggantikan dashboard.
- HTTP 404/410 menghapus langganan milik household tersebut. Kegagalan perangkat lain dihitung tanpa menggagalkan kiriman berikutnya; galat DB awal menghasilkan 503.
- Payload terenkripsi hanya `{type:"dose_due",slotId}`. Worker berikutnya harus merakit teks netral dari copy.ts dan membuka `/scan?dosis=<slotId>`; tanpa nama/kekuatan/instruksi pada notifikasi. Klik selalu mengecek status server lagi. Push tidak pernah mengonfirmasi minum atau mengubah hitungan.

## Cron yang harus disiapkan operator kelak

Sesudah frontend dan target siap serta pengujian perangkat berhasil, buat job cron-job.org: **POST URL-backend/v1/internal/reminders/run tiap menit**, header x-cron-secret berisi secret target. Uji manual pada layanan yang disetujui dan ulangi request untuk memeriksa dedupe. Jangan menaruh secret di URL, body repo, screenshot atau log. Job harian GET /v1/health terpisah dan tidak memakai secret; rencana pemantauan ada di [checklist rilis](release-checklist.md).

Tidak membuat cron cloud pada branch ini. Kegagalan kirim, jadwal yang diubah setelah notifikasi diterima dan pembatasan browser tetap harus ditangani lewat pemeriksaan server/UX frontend. iOS memerlukan aplikasi Home Screen serta izin dari tindakan pengguna ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)); belum diuji di perangkat.

## Bukti dan batas pengujian

Verifikasi branch backend: typecheck kedua paket lulus (6,20 dtk), lint termasuk 48 probe batas impor lulus (23,60 dtk), suite penuh lulus 743 backend/50 berkas + 559 frontend/49 berkas (61,44 dtk keseluruhan). Tes terarah 74 lulus, termasuk konfigurasi push opsional. Tidak menjalankan build frontend ulang karena belum ada perubahan frontend. Pemeriksaan dokumentasi: 49 tautan lokal dan enam anchor valid.

Tes mencakup validasi endpoint/keys, household sesi/consent, cron salah/benar tanpa sesi, konfigurasi nonaktif, enkripsi/VAPID asli tanpa jaringan, pemisahan perangkat/slot, kegagalan/expired, status dosis batas/lintas hari/Q5 dan RPC migrasi pada SQL memori. Tes klaim bersamaan memakai satu koneksi PGlite yang menserialisasi query; belum membuktikan balapan dua koneksi Supabase nyata. Unique constraint dan ON CONFLICT tetap pagar produksi.

Belum membuktikan delivery provider, penerimaan/klik worker, Android/iOS, pemulihan seed pada schema baru, atau konfigurasi cloud. Lihat [checklist manual](manual-test-checklist.md) dan [panduan deploy](deploy.md) sebelum aktivasi. Tidak ada teks UI/DRAFT baru pada backend; teks izin/notifikasi milik branch frontend berikutnya.
