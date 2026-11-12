# Keterlacakan kriteria penerimaan

Posisi: row44, 12 November 2026. Sumber kriteria: [docs/05](05-acceptance-criteria.md); penafsiran logika mengikuti [aturan domain](01-domain-rules.md) dan [keputusan kit/PM](07-open-decisions.md). Dokumen ini mencatat bukti, bukan mengubah kriteria atau menyetujui usulan.

## Cara membaca status dan lapisan

- **Lulus (otomatis)**: klausul fungsi yang disebutkan dicakup tes terdaftar pada lingkupnya. Ini bukan klaim pengujian browser/perangkat atau layanan produksi.
- **Belum lengkap**: sebagian bukti otomatis lulus, tetapi ada klausul AC yang masih memerlukan bukti layanan/perangkat. Alasan dan langkah lanjut dicantumkan per baris.
- **Gagal**: ada pemeriksaan yang dijalankan dan hasilnya tidak sesuai. Belum ada hasil gagal pada verifikasi akhir row44; hal yang belum dicoba tidak dihitung sebagai lulus.
- **D** domain murni; **A** application dengan port terkendali; **I** adaptor/SQL dengan fixture; **U** komponen/hook frontend di JSDOM; **E** alur HTTP; **M** pemeriksaan manual. U ditambahkan agar tes komponen tidak disalahartikan sebagai E browser.

E memakai backend Hono localhost, SDK/adaptor Supabase, PostgreSQL PGlite dan HMAC asli. Transport Auth/PostgREST serta AI tiruan; PGlite satu koneksi. Batas ini berlaku untuk seluruh baris yang memakai E/I, termasuk pendaftaran dan pencabutan sesi tiruan. Checklist M seluruhnya masih belum dijalankan di Android/iOS nyata. [Rincian HTTP](../README.md#menguji-alur-lengkap-lewat-http) dan [checklist](manual-test-checklist.md).

Ringkasan: **20 Lulus (otomatis), 6 Belum lengkap, 0 Gagal**. AC-01/02/05/09/16/26 belum lengkap. AC-17–26 tetap berlabel **USULAN** sesuai sumber; lulus tes tidak berarti persetujuan PM. Q1/Q2/Q5 yang sudah diputuskan tetap mengikuti docs/01/07.

## Matriks AC → bukti

Tautan tes menunjuk berkas nyata; uraian setelah tautan menyebut kasus yang harus diperiksa. Rujukan M menaut ke tabel hasil perangkat, yang masih berstatus Belum.

| AC | Fungsi / lapisan | Bukti otomatis dan cakupannya | Status | Bukti tersisa / langkah manual |
|---|---|---|---|---|
| AC-01 | Registrasi, consent, sesi, dua HP · A/U/E/M | [auth-forms][auth]: tanpa centang tidak daftar; sesi baru mencatat consent, email-confirmation diarahkan ke langkah lanjutan. [AuthGuard][guard]: consent/keluar/pergantian akun. [polling][poll]: 20 detik saat aktif, berhenti di latar, refetch saat fokus. [golden HTTP][gold]: SDK daftar → consent → akses jadwal. | **Belum lengkap** | Sesi tersimpan setelah browser ditutup dan sinkronisasi dua HP belum diuji pada layanan/perangkat nyata: [M01](manual-test-checklist.md#m01), [M15](manual-test-checklist.md#m15). |
| AC-02 | Demo dan penghapusan · A/I/U/E/M | [auth-forms][auth]: tombol demo dengan/tanpa konfigurasi dan kegagalan login. [seed][seed]: data normal/due, ID tetap. [settings][settings], [edit/delete][edit], [golden HTTP][gold], [safety HTTP][safety], [cascade SQL][cascade]: hapus per obat/akun, demo ditolak, keluarga lain utuh. | **Belum lengkap** | Kredensial demo yang akan dipakai juri dan data siap demo belum diverifikasi pada environment rilis; tes login memakai stub. Coba login demo dan akun sekali pakai, [M01](manual-test-checklist.md#m01), [M10](manual-test-checklist.md#m10). |
| AC-03 | Formulir dan nama familiar · D/U | [form][form]: isian kosong/galat, isian lengkap, nama dari 15 pilihan atau ketik sendiri, jadwal 1–6. [validasi][form-schema]: kolom wajib/sumber, jam unik, catatan kosong menjadi null. [nama familiar][familiar]: nama tanpa kekuatan. Tes isian lengkap mengetik kekuatan/kolom lain secara terpisah. | **Lulus (otomatis)** | Catatan pribadi opsional menurut docs/01; bukan sembilan kolom wajib. Periksa pemilih nama native dan keyboard HP pada [M02](manual-test-checklist.md#m02). |
| AC-04 | Pop-up pemeriksaan · U/E | [tambah/periksa][add]: #1, semua data asli, POST hanya setelah konfirmasi; Perbaiki lagi mempertahankan isian dan memanggil explain baru; Esc/tutup tidak menyimpan. [golden HTTP][gold]: explain belum memasukkan obat, POST terpisah baru menyimpan. [copy][copy]: #1 dan tombol persis. | **Lulus (otomatis)** | Fokus, scroll dan keterbacaan native: [M02](manual-test-checklist.md#m02), [M14](manual-test-checklist.md#m14). HTTP tidak menekan pop-up; bukti tombol berasal dari U. |
| AC-05 | Dashboard · D/U/E/M | [dashboard][dash]: B1, progres/status server, slot lintas tanggal, kosong/galat. [kelompok dosis][groups] dan [kartu dosis][cards]: kelompok dan ✓/✓✓. [golden HTTP][gold]: 0/2 → 1/2 → 2/2. [token desain][tokens]: ukuran/kontras token minimum. | **Belum lengkap** | Bagian M pada AC belum dijalankan: tombol besar, orientasi, pembaca layar dan keterbacaan HP nyata pada [M03](manual-test-checklist.md#m03), [M14](manual-test-checklist.md#m14). |
| AC-06 | Consent sebelum scan · A/U/E | [scan-screen][capture]: #2, HP baru meminta lagi, flag HP tidak mengganti consent akun, batal tidak menyimpan flag, kegagalan storage tertangani, capture baru tersedia setelah setuju. [golden HTTP][gold]: scan sebelum consent ditolak dan pembaca AI tidak dipanggil. [copy][copy]: #2 persis. | **Lulus (otomatis)** | Pemilih kamera dan izin OS belum dibuktikan oleh JSDOM: [M04](manual-test-checklist.md#m04), [M11](manual-test-checklist.md#m11). |
| AC-07 | Informasi dan privasi foto · I/U/E | [scan-outcome][outcome]: AI hanya bila diperiksa, data asli selalu ada, nextDose dari server. [copy][copy]: seluruh kombinasi #3 termasuk malam ini 19.00 dan null. [scan-screen][capture]: foto sementara/URL dibuang, tidak masuk cache. [migrasi][migrations]: tidak ada kolom foto. [golden HTTP][gold]: log tanpa foto/token/nama/teks. [pembaca AI][reader]: hanya image inline, tanpa metadata akun. | **Lulus (otomatis)** | Tidak membuktikan akurasi foto nyata, retensi penyedia AI, atau inspeksi deployment/storage produksi. Uji kemasan dan layanan uji pada [M04](manual-test-checklist.md#m04), [M08](manual-test-checklist.md#m08). |
| AC-08 | Hasil cocok lalu konfirmasi · A/U/E | [scan-outcome][outcome]: #4 untuk slot terpilih, tanggal/jam/sumber. [scan-result][result]: Lanjut membuka #5 tanpa POST dan fokus aman. [golden HTTP][gold]: bacaan ejaan garam cocok dan verified setelah token sah. [copy][copy]: #4/#5 persis. | **Lulus (otomatis)** | Uji urutan UI/kamera nyata pada [M05](manual-test-checklist.md#m05). |
| AC-09 | ✓✓ dan Nanti dulu · D/I/U/E | [scan-result][result]: Nanti dulu/Esc/tutup tanpa POST; klik ganda satu POST. [golden HTTP][gold]: verified ✓✓ meningkatkan 0/2 ke 1/2. [safety HTTP][safety]: scan saja nol catatan, dua POST 201/409. [constraint SQL][constraints]: unik per slot dan replay tidak mengganti level. | **Belum lengkap** | Verified 0/2→1/2 dan basic 1/2→2/2 sudah diuji, tetapi transisi **verified 1/2→2/2** yang disebut AC belum punya assertion eksplisit. Tambahkan tes untuk urutan itu atau catat hasil [M05](manual-test-checklist.md#m05). HTTP paralel memakai satu koneksi PGlite, belum race dua koneksi server. |
| AC-10 | Konfirmasi dasar ✓ · A/U/E | [konfirmasi basic][basic]: Batal/Esc/tutup tanpa POST; POST sukses, jaringan putus, tanpa antrean offline. [kartu dosis][cards]: ✓ berbeda ✓✓. [golden HTTP][gold]: malam basic → 2/2, level pagi tetap scan. [copy][copy]: #10 dan tombol. | **Lulus (otomatis)** | Periksa kedua simbol dan pembatalan pada [M06](manual-test-checklist.md#m06). |
| AC-11 | Nama tidak terlihat · D/I/U | [matcher][match]: legible=false mengalahkan nama/kekuatan. [pembaca AI][reader]: legible=false membuang data, keluaran rusak ditolak. [scan-outcome][outcome]: #9 persis. [copy][copy]: #9 ada di docs/02. | **Lulus (otomatis)** | Bukti bersyarat pada bacaan fixture; belum akurasi Vision atas foto tanpa kemasan nyata. [M08](manual-test-checklist.md#m08). |
| AC-12 | Kekuatan berbeda · D/U/E | [matcher][match]: angka/satuan berbeda; [keputusan hasil][decide]: prioritas penolakan. [scan-outcome][outcome]: #7 untuk semua kandidat, tidak menambah larangan medis/konfirmasi. [safety HTTP][safety]: mismatch tanpa scanToken atau catatan. | **Lulus (otomatis)** | Bacaan Vision nyata belum diuji: [M08](manual-test-checklist.md#m08). |
| AC-13 | Bukan obat untuk jadwal ini · D/A/U | [keputusan hasil][decide]: obat lain due, target tidak dipindahkan. [rute scan][scan-api]: tunggu_dulu tanpa token. [scan-outcome][outcome]: #6 menyebut semua obat due serta tanggal/jam, nextDose null tidak menebak jam. [copy][copy]: templat #6. | **Lulus (otomatis)** | Uji kemasan/jadwal asli pada lingkungan uji: [M07](manual-test-checklist.md#m07), [M08](manual-test-checklist.md#m08). |
| AC-14 | Obat belum terdaftar · D/U/E | [matcher][match]: daftar kosong/nama asing tidak menebak dan tidak menerjemahkan merek. [rute scan][scan-api]: tidak_terdaftar tanpa token. [scan-outcome][outcome]: #8, formulir tambah kosong, nama tebakan tidak ditampilkan. | **Lulus (otomatis)** | Uji foto dan pesan nyata pada [M08](manual-test-checklist.md#m08). |
| AC-15 | Terlewat dan AI gagal · D/I/U/E | [window][window]: J+120 inklusif, lewat 1 ms terlewat. [kartu dosis][cards]: terlewat tanpa aksi. [scan-screen][capture]: error/kuota/timeout memakai #12 tanpa retry otomatis. [safety HTTP][safety]: scan AI gagal nol catatan, basic tetap berhasil. | **Lulus (otomatis)** | Durasi/kejelasan pada jaringan nyata belum: [M12](manual-test-checklist.md#m12), [M13](manual-test-checklist.md#m13). |
| AC-16 | Pilihan teks/suara dan teks besar · U/E/M | [preferensi][preference]: simpan pilihan dan galat; [settings][settings]: ubah dari pengaturan. [scan-result][result]: pemicu pilihan pertama sebelum hasil. [suara scan][scan-voice], [suara obat][medicine-voice], [suara dashboard][dash-voice]: Bacakan di empat tempat tanpa POST/autoplay. [token desain][tokens]: isi minimum 18 px. | **Belum lengkap** | Suara Indonesia/audio dan teks besar pada HP nyata belum diuji; opsi engine merupakan tiruan. [M05](manual-test-checklist.md#m05), [M09](manual-test-checklist.md#m09), [M14](manual-test-checklist.md#m14). |
| AC-17 · USULAN | Scan di luar jendela · D/U/E | [keputusan hasil][decide]: belum_tiba/terlewat → hanya_info tanpa slot. [scan-outcome][outcome]: informasi tanpa konfirmasi. [safety HTTP][safety]: hanya_info tanpa token/hitungan/catatan baru. | **Lulus (otomatis)** | [M08](manual-test-checklist.md#m08); usulan D12 mengikuti nilai kit, bukan persetujuan baru. |
| AC-18 · USULAN | Dua obat berjam sama · D/E | [keputusan hasil][decide]: hanya slot obat terbaca ditawarkan. [safety HTTP][safety], kasus dua obat 07.00: keduanya due, token tidak dapat dipindahkan ke obat kedua, hanya obat pertama tercatat. | **Lulus (otomatis)** | [M07](manual-test-checklist.md#m07). |
| AC-19 · USULAN | Scan dosis sudah tercatat · D/U/E | [keputusan hasil][decide]: dosis tercatat tidak dialihkan; [rute scan][scan-api]: sudah tercatat tanpa token; [scan-outcome][outcome]: tidak ada tombol konfirmasi, tidak menebak metode/jam pencatatan. [copy][copy]: D-a dengan/tanpa jadwal berikutnya. | **Lulus (otomatis)** | [M08](manual-test-checklist.md#m08); status/kalimat DRAFT bukan persetujuan PM. |
| AC-20 · USULAN | Dibuat 15.00, jadwal 07.00/19.00 · D | [slot harian][slots], kasus AC-20: hanya slot 19.00; tepat J versus J+1 ms, hari berikutnya dan tanggal asal turut diuji. | **Lulus (otomatis)** | [M03](manual-test-checklist.md#m03); aturan D11 masih nilai kit. |
| AC-21 · USULAN | Normalisasi Amlodipine besylate · D/E | [matcher][match]: garam/sediaan/akhiran/kekuatan dinormalisasi, tanpa terjemahan merek. [golden HTTP][gold]: bacaan Amlodipine besylate cocok dengan Amlodipin 5 mg hingga verified. | **Lulus (otomatis)** | E memakai bacaan AI stub, bukan pengukuran akurasi OCR. [M08](manual-test-checklist.md#m08). |
| AC-22 · USULAN | Kekuatan belum terbaca · D/I/U | [matcher][match]: null/kosong/angka tanpa satuan/tidak dipahami ditolak. [pembaca AI][reader]: strength null diteruskan ke kode. [scan-outcome][outcome]: D-b tanpa klaim cocok atau konfirmasi. | **Lulus (otomatis)** | [M08](manual-test-checklist.md#m08); D-b tetap DRAFT. |
| AC-23 · USULAN | AI gagal saat tambah · D/U/E | [tambah/periksa][add]: unavailable/quota/timeout/network/invalid response → fallback setelah konfirmasi manusia. [safety HTTP][safety]: explain belum menyimpan, fallback teks_pengisi/null lalu basic. [suara obat][medicine-voice]: AI belum diperiksa tidak dibacakan pada detail. | **Lulus (otomatis)** | [M02](manual-test-checklist.md#m02), [M12](manual-test-checklist.md#m12); mengikuti default D3. |
| AC-24 · USULAN | Edit dan periksa ulang · U/E | [edit/delete][edit]: sumber wajib dipilih ulang, explain ulang walau teks sama, PATCH hanya setelah konfirmasi; koreksi/refetch/AI gagal. [safety HTTP][safety]: data berubah, riwayat konfirmasi tetap. | **Lulus (otomatis)** | [M02](manual-test-checklist.md#m02), [M10](manual-test-checklist.md#m10). |
| AC-25 · USULAN | Hapus obat/akun dan demo · A/I/U/E | [edit/delete][edit]: pop-up, batal/konfirmasi, cache setelah sukses. [settings][settings]: dua langkah/kata sandi salah/benar/demo. [cascade SQL][cascade], [golden HTTP][gold]: enam tabel bersih, akun lain utuh; [safety HTTP][safety]: demo403. | **Lulus (otomatis)** | Reautentikasi dan pencabutan sesi Supabase asli masih perlu [M10](manual-test-checklist.md#m10). |
| AC-26 · USULAN | Buka mode suara dari sesi tersimpan · U/M | [useSpeech][speech]: SSR, tanpa autoplay, hanya suara lokal Indonesia, daftar kosong/terlambat, penghentian lifecycle. [Bacakan][bacakan]: D-d persis; [scan-result][result]: mode teks/suara sama-sama tidak autoplay. | **Belum lengkap** | AC ini mensyaratkan M: buka ulang sesi browser dengan mode Suara pada Android/iOS; ketersediaan suara dan audio terdengar belum diperiksa. [M01](manual-test-checklist.md#m01), [M09](manual-test-checklist.md#m09). |

## Verifikasi dan batas penutupan

Jalankan dari akar: `pnpm typecheck`, `pnpm lint`, `pnpm test`. E HTTP termasuk dalam suite penuh; perintah khusus: `pnpm --filter backend test:e2e --reporter=dot`. Kalimat baku dapat diperiksa terarah dengan `pnpm --filter frontend test src/shared/copy/copy.test.ts --reporter=dot`. [Audit teks](copy-audit.md) mencatat ruang pemeriksaan dan pesan teknis yang tidak dirender.

Verifikasi ulang row44: `pnpm typecheck`, `pnpm lint`, dan `pnpm test` lulus; 649 tes backend + 534 frontend (41/47 berkas). Pemeriksaan terarah copy 69 dan E HTTP 11 juga lulus. Validasi dokumen memastikan 26 AC unik, hitungan status 20/6, 36 referensi bukti, 15 penanda manual dan 105 tautan lokal sah. Tidak ada pemetaan yang mengganti hasil manual Belum menjadi lulus karena suite otomatis hijau.

Untuk menutup enam AC belum lengkap: isi hasil aktual pada M01/M03/M05/M09/M10/M14/M15, verifikasi login demo pada environment rilis, dan buktikan verified 1/2→2/2 pada AC-09. Catat perangkat/OS/browser/commit/waktu WIB serta hasilnya; rujuk bukti yang tidak mengandung kredensial/foto/data pribadi. Perbarui status AC hanya setelah klausul yang kurang terbukti. Tinjauan DRAFT/usulan PM terpisah dari hasil tes.

Belum dibuktikan secara global: kualitas Gemini pada foto nyata, layanan GoTrue/PostgREST/JWT dan deployment Supabase asli, retensi penyedia AI, race dua koneksi PostgreSQL, Android/iOS, kamera, pembaca layar, dan audio native. Pemeriksaan terkait tersedia di checklist; tidak semuanya merupakan klausul terpisah dalam 26 AC ini. Dokumen ini tidak menyatakan MVP/produksi siap rilis.

[auth]: ../frontend/src/features/auth/components/auth-forms.test.tsx
[guard]: ../frontend/src/features/auth/components/auth-guard.test.tsx
[poll]: ../frontend/src/features/doses/hooks/use-todays-doses.test.tsx
[seed]: ../backend/tests/seed/demo-data.test.ts
[settings]: ../frontend/src/features/settings/components/settings-screen.test.tsx
[edit]: ../frontend/src/features/medicines/components/edit-delete.test.tsx
[form]: ../frontend/src/features/medicines/components/medicine-form.test.tsx
[form-schema]: ../frontend/src/features/medicines/schemas/medicine-form.test.ts
[familiar]: ../frontend/src/features/medicines/data/familiar-medicines.test.ts
[add]: ../frontend/src/features/medicines/components/add-medicine-screen.test.tsx
[copy]: ../frontend/src/shared/copy/copy.test.ts
[dash]: ../frontend/src/features/doses/components/dashboard-screen.test.tsx
[groups]: ../frontend/src/features/doses/components/dose-groups.test.tsx
[cards]: ../frontend/src/features/doses/components/dose-card.test.tsx
[tokens]: ../frontend/src/app/design-tokens.test.ts
[capture]: ../frontend/src/features/scan/components/scan-screen.test.tsx
[outcome]: ../frontend/src/features/scan/components/scan-outcome-view.test.tsx
[result]: ../frontend/src/features/scan/components/scan-result-flow.test.tsx
[basic]: ../frontend/src/features/doses/components/dose-confirmation.test.tsx
[match]: ../backend/tests/unit/verification/match-package.test.ts
[decide]: ../backend/tests/unit/verification/decide-outcome.test.ts
[scan-api]: ../backend/tests/interface/scan.routes.test.ts
[reader]: ../backend/tests/infrastructure/gemini-package-reader.test.ts
[migrations]: ../backend/tests/db/migrations.test.ts
[window]: ../backend/tests/unit/dosing/dose-window.test.ts
[slots]: ../backend/tests/unit/dosing/daily-slots.test.ts
[preference]: ../frontend/src/features/preferences/components/output-preference-screen.test.tsx
[speech]: ../frontend/src/shared/hooks/use-speech.test.tsx
[bacakan]: ../frontend/src/shared/ui/bacakan.test.tsx
[medicine-voice]: ../frontend/src/features/medicines/components/medicine-voice.test.tsx
[scan-voice]: ../frontend/src/features/scan/components/scan-voice.test.tsx
[dash-voice]: ../frontend/src/features/doses/components/dashboard-voice.test.tsx
[gold]: ../backend/tests/e2e/http-golden-flow.test.ts
[safety]: ../backend/tests/e2e/http-safety-flows.test.ts
[cascade]: ../backend/tests/db/account-deletion.test.ts
[constraints]: ../backend/tests/db/data-constraints.test.ts
