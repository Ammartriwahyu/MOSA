# Audit aksesibilitas — row48

Tanggal: 13 November 2026. Branch `fix/a11y-audit`, di atas `fix/security-privacy-audit`.

Audit memeriksa komponen layar produk, semantik, fokus keyboard, pembesaran teks dan kontras. Hasil desktop dengan data fiktif ini bukan sertifikasi WCAG atau bukti pengujian pembaca layar/perangkat nyata. Audit arsitektur/kinerja dan laporan gabungan `review-report.md` tetap row49.

## Temuan dan perbaikan

Semua temuan berikut telah diperbaiki. Tidak ada temuan tinggi terkonfirmasi dalam cakupan audit ini yang dibiarkan terbuka.

| ID / tingkat sebelum perbaikan | Temuan | Perbaikan dan bukti |
|---|---|---|
| A01 / Sedang | Dialog yang dibuka tombol biasa kehilangan fokus pemicu setelah Escape; fokus berakhir di body. | [Dialog](../frontend/src/shared/ui/dialog.tsx) merekam elemen aktif sebelum dibuka dan memulihkan fokus saat ditutup, dengan prioritas returnFocusRef eksplisit. Elemen yang sudah dilepas tidak difokus kembali. [Tes keyboard](../frontend/src/shared/ui/ui.test.tsx) terlebih dahulu gagal pada pemulihan fokus, lalu lulus; Tab/Shift+Tab tetap terjebak dalam dialog. |
| A02 / Tinggi | Token teks piksel tetap tidak mengikuti ukuran akar 200%. Setelah teks benar-benar membesar, tinggi tombol/segmented radio dan rasio panel foto memotong isinya; kolom sempit membuat kata tersusun satu huruf per baris atau bertumpuk. | [Tema](../frontend/src/app/globals.css) memakai rem, mempertahankan ukuran awal pada akar 16 px. [Button](../frontend/src/shared/ui/button.tsx) memakai tinggi minimum, [ChoiceCards](../frontend/src/shared/ui/choice-cards.tsx), onboarding, header, daftar obat, baris akun dan tombol scan menata ulang isi saat ruang relatif terhadap teks sempit. [Label pengisi](../frontend/src/features/medicines/components/label-source-field.tsx) dapat membungkus dan bertambah tinggi; [panel foto](../frontend/src/features/scan/components/scan-capture-view.tsx) mengikuti tinggi teks saat kosong, mempertahankan rasio saat menampilkan foto. Tes token/tombol gagal sebelum perbaikan; pengukuran browser menunjukkan tombol lama tinggi 57 px dengan isi 131 px dan panel foto tinggi 254 px dengan isi 409 px. Hasil akhir tidak terpotong. |
| A03 / Tinggi | Navigasi bawah pada 200% keluar sisi layar dan saling menutupi. Pemeriksaan scrollWidth halaman saja tidak mendeteksi seluruh masalah pada elemen fixed. | [BottomNav](../frontend/src/shared/ui/bottom-nav.tsx) memakai grid; pada ruang sempit relatif terhadap ukuran teks, tiga tujuan ditata vertikal dengan label utuh. [AppShell](../frontend/src/shared/ui/app-shell.tsx) menyediakan ruang bawah sesuai susunan tersebut. Pengukuran akhir memeriksa batas setiap elemen, perpotongan sasaran navigasi dan sisa padding di atas navigasi, selain lebar halaman. |
| A04 / Sedang | Bingkai isian #c9d1cd hanya 1,56:1 terhadap putih. Ujung gradasi banner #3d8466 hanya 4,48:1 untuk putih; ujung onboarding #4e8c6f hanya 3,96:1. | Token field-border menjadi #7a877f: 3,75:1 terhadap surface dan 3,39:1 terhadap canvas. brand-light/brand-glow menjadi #397f61: putih 4,79:1. Chip waktu [Banner](../frontend/src/shared/ui/banner.tsx) memakai latar brand-strong pekat. [Tes kontras](../frontend/src/app/design-tokens.test.ts) membuktikan kegagalan pasangan lama dan keberhasilan pasangan baru. Nilai Figma disesuaikan untuk minimum aksesibilitas sesuai docs/06; bukan perubahan kalimat atau aturan medis. |
| A05 / Sedang | Indikator fokus hijau sulit dibedakan pada latar hijau/gelap; input menghapus outline global. | Tema memberi outline ink dengan lapisan putih sehingga terlihat pada latar terang/gelap; [Field](../frontend/src/shared/ui/field.tsx) mempertahankan indikator tersebut. Browser memverifikasi fokus keyboard pada kata sandi memiliki outline ink dan lapisan putih. Pilihan radio/checkbox tetap memiliki outline pada kartu serta label native. |

Penataan berbasis ukuran teks memakai container query `16em`, sehingga kartu/header/navigasi beradaptasi terhadap ruang dan ukuran teks, mengikuti [mekanisme container query Tailwind](https://tailwindcss.com/docs/responsive-design#container-queries). Wrapper biasa dipakai di luar fieldset agar query bekerja di browser uji. Bahasa, isi kalimat, tujuan navigasi, urutan DOM radio, persetujuan, dan tindakan penyimpanan tetap memakai komponen produk.

## Cakupan layar dan keadaan

| Area | Bukti |
|---|---|
| Welcome, login, register, consent | [a11y-screens.test.tsx](../frontend/src/app/a11y-screens.test.tsx): masing-masing satu h1, landmark utama dan axe; browser memakai komponen yang sama pada teks 100%/200%. Validasi/alert autentikasi tetap diuji pada [auth-forms.test.tsx](../frontend/src/features/auth/components/auth-forms.test.tsx). |
| Dasbor, daftar obat, detail, tambah, ubah | Matriks layar bersama memeriksa tiap halaman dalam shell yang sesuai. Browser memakai dasbor berisi dosis fiktif, daftar/detail terisi, formulir tambah/ubah. Keadaan kosong/galat, dialog pemeriksaan AI/hapus, fokus validasi dan konfirmasi dosis tetap tercakup tes fitur yang sudah ada. |
| Pilihan tampilan dan pengaturan | Matriks bersama, tes fitur dan browser pada dua ukuran teks. Dialog hapus akun diperiksa dengan keyboard pada ukuran normal dan 200%; tidak ada penghapusan atau panggilan backend saat pemeriksaan browser. |
| Scan | Matriks bersama memeriksa layar persetujuan. Browser memeriksa tampilan capture kosong dan seluruh delapan outcome melalui komponen produk. [scan-screen.test.tsx](../frontend/src/features/scan/components/scan-screen.test.tsx) mencakup persetujuan, capture, pemrosesan, galat dan axe; [scan-outcome-view.test.tsx](../frontend/src/features/scan/components/scan-outcome-view.test.tsx) menguji delapan hasil. Dialog verifikasi tetap diuji pada [scan-result-flow.test.tsx](../frontend/src/features/scan/components/scan-result-flow.test.tsx). Kamera/unggah dan suara nyata tidak dijalankan. |
| Dialog dan kontrol bersama | Tes UI memeriksa nama/deskripsi, fokus awal di dialog, Esc, perangkap Tab, pemulihan pemicu dan tinggi minimum tombol. Semantik, label, status dan pilihan native tetap diuji oleh suite bersama/fitur. |

Matriks baru mencakup seluruh 12 tujuan halaman produk di [routes.ts](../frontend/src/shared/config/routes.ts), termasuk detail dan edit dinamis; katalog dev bukan layar pengguna. Ini memeriksa komponen terpasang dalam shell, bukan navigasi router, autentikasi atau integrasi API sesungguhnya.

## Hasil browser dan kontras

- **40 pemeriksaan axe:** 20 tampilan (12 utama, delapan outcome scan) × teks 100%/200% pada lebar 360 px. Tidak ada violation. Hanya welcome dan dashboard pada kedua skala yang tetap `incomplete: color-contrast` karena gradasi; status incomplete tidak dihitung sebagai kelulusan otomatis.
- **120 pemeriksaan tata letak:** 20 tampilan × lebar 360/390/430 px × skala 100%/200%, tinggi viewport 800 px. Ukuran akar diubah dari 16 ke 32 px; teks isi terukur 18→36 px. Ini simulasi preferensi ukuran teks melalui CSS, bukan pembuktian pinch zoom atau pengaturan font Android/iOS.
- Pemeriksaan akhir menemukan **0** luapan horizontal halaman/elemen, **0** isi tombol atau kotak ber-overflow-hidden yang terpotong, dan **0** benturan sasaran navigasi; padding bawah cukup terhadap tinggi navigasi. Toleransi geometri 2 px dipakai untuk pembulatan. Pemeriksaan ini dilengkapi inspeksi visual, bukan pengganti pembaca layar.
- Keyboard nyata di browser uji: fokus awal dialog bukan tombol berbahaya; Tab/Shift+Tab berputar di dalam modal; Escape memulihkan tombol Hapus Seluruh Data & Akun. Pada 200%, Batal dapat difokus dan terlihat penuh setelah konten digulir otomatis oleh fokus.
- Gradasi diperiksa terpisah: putih di kedua ujung gradasi aksi ≥4,79:1; ink di day-from/day-to 14,33/17,16:1, serta hero-from/hero-to 13,63/16,29:1. Penghitungan memakai token aktual; tes token tetap menegakkan pasangan teks utama ≥4,5:1 dan bingkai input ≥3:1. Gradasi dengan input warna baru tetap perlu ditinjau ulang.
- Dokumen memakai `lang="id"`, viewport tidak mengunci zoom, pengurangan gerak tersedia, status tidak hanya dibedakan oleh warna. Banner dan hasil scan mempertahankan live region polite; galat memakai alert dan pemuatan memakai status. Audit memeriksa struktur/kode dan tes, belum cara pengumuman setiap mesin pembaca layar.

Pratinjau sementara hanya merangkai komponen produk dengan cache/data fiktif; seluruh alamat API/Auth diarahkan ke loopback yang tidak melayani API. Tidak memakai kredensial, `.env` tidak dibaca, tidak mengirim foto atau memanggil AI. Dua berkas pratinjau telah dihapus; server uji dihentikan, tab uji ditutup dan override viewport dipulihkan. Data hasil/screenshot tersimpan lokal di folder visualisasi sesi, tidak masuk git. Cache pengembangan lama dipindahkan ke `.claude/cache/` yang di-ignore agar pemeriksaan tidak memakai CSS atau tipe rute pratinjau yang usang.

## Verifikasi dan batas yang masih ada

Tes terarah lima berkas: **109 lulus**. Jalankan ulang dari akar:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Pemeriksaan akhir berurutan lulus seluruhnya: `pnpm typecheck`, `pnpm lint`, dan `pnpm test`: **671 backend pada 43 berkas (40,34 detik) + 559 frontend pada 49 berkas (58,01 detik)**, termasuk 11 HTTP E2E. Bertambah 19 tes frontend dari row47. Lint awal meminta perbaikan fixture JSX dalam array; matriks kini memakai factory per layar, lalu typecheck/lint diulang sebelum suite penuh. Seluruh 20 tautan lokal laporan valid dan `git diff --check` bersih.

Tidak menambah dependency, mengubah worker/timeout/retry, menonaktifkan aturan axe tambahan, atau mengubah kalimat UI/DRAFT. Tes jsdom menonaktifkan color-contrast karena tidak merender layout; pemeriksaan browser di atas mengaktifkannya dan mencatat incomplete secara eksplisit.

TalkBack, VoiceOver, NVDA, zoom native, kamera, suara, interaksi sentuh perangkat dan keterbacaan oleh pengguna lansia tetap belum terbukti. Hasil perangkat pada [checklist manual](manual-test-checklist.md) tetap Belum. [Matriks AC](ac-traceability.md) tetap 20 Lulus otomatis/6 Belum lengkap/0 Gagal; AC-01/02/05/09/16/26 tidak ditutup oleh audit desktop ini. Data/layanan nyata dan audit kinerja berada di luar bukti branch ini.
