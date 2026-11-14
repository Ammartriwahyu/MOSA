# 05 · Kriteria Penerimaan dan Pemetaan Pengujian

AC-01–AC-16: dari PRD §15 (final). AC-17–AC-26: **[USULAN]** analisis v2.1, menutup celah yang tidak dicakup PRD; aktifkan setelah tim menyetujui `docs/07`.
Kolom "Lapis" = tempat tes utama: **D** domain unit, **A** application (repo palsu), **I** infrastruktur (fixture), **E** end-to-end, **M** manual di HP nyata.

Pemeriksaan perangkat dicatat di [checklist manual](manual-test-checklist.md); sumber kalimat tersedia di [copywriting baku](02-copywriting-baku.md). Rujukan ini tidak mengubah kriteria di bawah atau status usulan.

| ID | Skenario | Hasil yang diharapkan | Lapis |
|---|---|---|---|
| AC-01 | Registrasi, persetujuan data, sesi tersimpan, akses dari 2 HP | Wajib centang persetujuan; sesi bertahan setelah browser ditutup; perubahan dari HP wali terlihat di HP lansia tanpa muat ulang manual (polling ≤ 15–30 detik) | A, E, M |
| AC-02 | Akun demo juri dan hapus data | Kredensial demo berfungsi dengan data siap uji; pengguna bisa hapus obat/akun; akun demo tidak bisa dihapus | A, E |
| AC-03 | Tambah Obat: dropdown atau ketik manual + label sumber | 9 isian terisi; dropdown hanya mengisi nama | E |
| AC-04 | Pop-up konfirmasi | Sebelum masuk DB muncul kalimat #1, data asli + penjelasan AI, tombol `Ya, sudah benar` / `Perbaiki lagi`; "Perbaiki lagi" mempertahankan isian | E |
| AC-05 | Dashboard | Dosis Pagi/Siang/Malam, status, hitungan per obat, tombol besar "Scan Obat", banner "Sekarang waktunya minum [Nama Obat]." | E, M |
| AC-06 | Scan pertama | Kalimat #2 tampil sebelum kamera terbuka; sekali per perangkat dan tercatat di akun | A, E |
| AC-07 | Scan lihat info | Penjelasan terverifikasi + "Obat ini perlu diminum lagi malam ini pukul 19.00." (kalimat #3); foto tidak disimpan | A, E |
| AC-08 | Scan verifikasi cocok | Kalimat #4 lalu pop-up #5 | A, E |
| AC-09 | Konfirmasi minum | `Sudah saya minum` → `sudah ✓✓`, 1/2→2/2; `Nanti dulu` → tetap `belum`, hitungan tidak berubah | D, A, E |
| AC-10 | Tanpa scan | `sudah ✓`, hitungan bertambah, ✓ berbeda dari ✓✓ | A, E |
| AC-11 | Foto tanpa kemasan | Kalimat #9 | A, I |
| AC-12 | Kekuatan berbeda | Kalimat #7, tanpa tombol konfirmasi | D, A |
| AC-13 | Obat terdaftar bukan jadwalnya | Kalimat #6, tanpa tombol konfirmasi | D, A |
| AC-14 | Obat belum terdaftar | Kalimat #8, tanpa tebakan AI | D, A |
| AC-15 | Terlewat dan AI gagal | Dosis lewat jendela jadi `terlewat`; AI gagal → kalimat #12 dan konfirmasi tanpa scan tetap bisa | D, A, E |
| AC-16 | Output teks/suara | Pilihan sekali di awal dan bisa diubah; "Bacakan" di setiap hasil; teks selalu besar | E, M |
| AC-17 | [USULAN] Scan obat terdaftar di luar jendela dosis | `hanya_info`; tanpa tombol konfirmasi; hitungan tetap | D, A |
| AC-18 | [USULAN] Dua obat berjam sama | Keduanya jatuh tempo; scan satu hanya mengonfirmasi obat itu | A |
| AC-19 | [USULAN] Scan obat yang dosisnya sudah tercatat | Tanpa tombol konfirmasi; kalimat D-a | A |
| AC-20 | [USULAN] Obat disimpan 15.00 berjadwal 07.00 dan 19.00 | Hari itu 0/1, tanpa "terlewat" palsu | D |
| AC-21 | [USULAN] "Amlodipine besylate" vs terdaftar "Amlodipin 5 mg" | Dikenali cocok | D |
| AC-22 | [USULAN] Angka kekuatan tidak terbaca | Minta foto ulang (D-b); tanpa konfirmasi | D, A |
| AC-23 | [USULAN] AI gagal saat Tambah Obat | Simpan tetap bisa dengan teks pengisi; tidak ada teks AI mentah ke lansia | A, E |
| AC-24 | [USULAN] Edit obat | Label sumber dipilih ulang, penjelasan dibuat ulang, pop-up muncul lagi | A, E |
| AC-25 | [USULAN] Hapus per obat dan hapus akun | Dua langkah; akun demo ditolak | A |
| AC-26 | [USULAN] Buka aplikasi lewat sesi tersimpan dengan mode suara aktif | Tidak ada suara otomatis sebelum sentuhan; tombol "Bacakan" menjadi jalur utama; tanpa suara id-ID → pesan D-d | M |

## Kasus batas waktu wajib (domain)
J−31 mnt `belum_tiba`; J−30 `jatuh_tempo`; J+120 tepat `jatuh_tempo`; J+120+1 ms dan J+121 `terlewat`; dua dosis berjarak 149 mnt maupun 150 mnt tetap terbuka bersama ketika masing-masing masih di dalam jendela (PM Q1/Q2, 11 Nov 2026); 23.59 vs 00.00 WIB berbeda hari, tanpa memotong jendela yang melintasi tengah malam; server di UTC tidak memengaruhi hasil.

Pemeriksaan domain: `pnpm --filter backend test tests/unit/dosing tests/application/dosing`. Suite Vitest memakai `America/New_York`; jalankan juga `pnpm --filter backend dose:check-utc` untuk membuktikan slot WIB dan batas akhir lintas tengah malam pada proses berzona UTC.

## Daftar periksa HP nyata (manual)

Android Chrome dan iPhone Safari: kamera `capture`, kompres foto, suara id-ID via tombol "Bacakan", sesi tetap setelah tutup browser, dua HP satu akun, layar kecil (360 px), teks besar, jaringan lambat (loading AI sampai 20 detik tetap jelas).
