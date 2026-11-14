# 01 · Aturan Domain (sumber kebenaran logika bisnis)

Legenda: **[PRD]** = sudah final di PRD. **[USULAN]** = usulan analisis PRD v2.1, belum disetujui tim; implementasikan sebagai konstanta/konfigurasi tunggal agar mudah diubah, dan tandai di kode dengan komentar `// USULAN: lihat docs/07-open-decisions.md`.

## 1. Pembagian tugas AI vs kode [PRD §12.1]
| Tugas | Pelaku |
|---|---|
| Membaca nama dan kekuatan dari foto kemasan | AI Vision |
| Menyederhanakan kalimat instruksi (sekali, saat simpan) | AI + verifikasi manusia (pop-up) |
| Mencocokkan hasil bacaan dengan daftar obat dan jadwal | **Kode** |
| Menentukan jadwal, kalimat pengingat, jadwal berikutnya, status `terlewat` | **Kode** |
| Menghitung progres `1/2` | **Kode** |

AI tidak mendiagnosis, tidak menentukan dosis, tidak mengatur jadwal, tidak menerjemahkan nama dagang ke generik, dan tidak menebak teks yang tidak terbaca.

## 2. Formulir Tambah Obat [PRD §9.2]
| # | Isian | Wajib | Catatan |
|---|---|---|---|
| 1 | Nama Obat | Ya | Dropdown 15–20 obat familiar **atau** ketik sendiri. Dropdown hanya mengisi nama, bukan kekuatan [PRD §19 #15] |
| 2 | Kekuatan | Ya | Angka + satuan ("5 mg"). Pembeda kritis saat scan |
| 3 | Kegunaan | Ya | UI memakai label "Kegunaan Obat" [PRD §19 #6] |
| 4 | Aturan Pakai | Ya | Beri petunjuk di bawah kolom: "Tulis hubungan dengan makan saja, tanpa jam. Contoh: sesudah makan." [USULAN] |
| 5 | Jumlah per Minum | Ya | "1 tablet", "1/2 tablet" |
| 6 | Jam Minum | Ya | Satu atau beberapa jam, "HH:mm" WIB, tanpa duplikat; menentukan kelompok waktu dan total harian |
| 6a | Hari Minum | Ya (bawaan "Setiap hari") | Satu sampai tujuh hari (Senin–Minggu, WIB). Hari yang tidak dipilih tidak punya slot, tidak masuk total harian, dan tidak memicu pengingat [Disetujui pengguna 14 Nov 2026] |
| 7 | Larangan / Peringatan | Ya, atau tegas "Tidak ada larangan khusus" [USULAN] | |
| 8 | Catatan Pribadi | Tidak | |
| 9 | Label Sumber | Ya | Segmented control: "Diisi apoteker" / "Diisi keluarga" |

Alur 6 langkah [PRD §9.2]: buka Tambah Obat → pilih/ketik nama → isi kolom + label sumber → tekan lanjut: sistem mengirim teks ke AI → pop-up konfirmasi (data asli + penjelasan AI) → `Ya, sudah benar` (simpan) atau `Perbaiki lagi` (kembali ke formulir dengan isian tetap terisi).

**Yang dikirim ke AI** [PRD §12.3 #1]: hanya teks aturan pakai, larangan/peringatan, dan catatan. Tanpa nama pasien, umur, email, atau data akun. Kolom *kegunaan* tetap disimpan dan ditampilkan, tetapi **tidak dikirim** ke AI secara default (dokumen final hanya menyebut aturan pakai, larangan, catatan; PRD §9.2 langkah 4 juga menyebut kegunaan: lihat keputusan D4 di `docs/07-open-decisions.md`). Satu konstanta `AI_INPUT_FIELDS` mengatur ini.

**Edit obat** [PRD §19 #11]: wajib melewati alur yang sama: pilih ulang label sumber, AI membuat ulang penjelasan, pop-up muncul lagi.

**Hapus** [PRD §19 #14]: per obat (halaman detail, dengan pop-up konfirmasi) dan seluruh data + akun (Pengaturan, dengan konfirmasi keamanan). Akun Demo Juri dilindungi dari penghapusan.

Aturan simpan: penjelasan AI hanya boleh tersimpan bila pengisi menekan `Ya, sudah benar` (`explanationOrigin = 'ai_dikonfirmasi'`). Bila AI gagal, simpan tetap boleh dengan `explanationOrigin = 'teks_pengisi'`: yang ditampilkan ke lansia adalah teks asli pengisi. Tidak pernah ada teks AI yang belum diperiksa manusia sampai ke lansia [USULAN untuk kasus AI gagal; lihat D3].

## 3. Status dosis [PRD §9.3, §19 #8, #9]
Setiap dosis punya jam jadwal **J** (WIB, UTC+7 tanpa DST). Status **tidak disimpan**; dihitung dari J, waktu sekarang, dan ada tidaknya konfirmasi.

| Status | Aturan |
|---|---|
| `belum_tiba` | sebelum J − 30 menit **[disetujui PM 11 Nov 2026; mengubah ketentuan awal PRD/flow]** |
| `jatuh_tempo` | J − 30 menit s.d. tepat J + 120 menit (kedua batas inklusif) |
| `terlewat` | lewat J + 120 menit tanpa konfirmasi; tidak bisa dikonfirmasi lagi [PRD: 120 menit] |
| `sudah` | ada konfirmasi (tingkat ✓ atau ✓✓) |

Tampilan dashboard memetakan `belum_tiba` dan `jatuh_tempo` ke label "belum" [PRD §9.3].

Aturan tambahan [USULAN]:
- **Disetujui PM 11 Nov 2026 (Q2, opsi 2):** jendela dua dosis obat yang sama tidak dipotong. Bila keduanya terbuka, pengguna memilih slot yang dikonfirmasi; mengonfirmasi satu slot tidak mengonfirmasi slot lainnya.
- Dua obat berjam sama: keduanya `jatuh_tempo`; scan satu hanya mengonfirmasi dosis obat itu.
- Obat disimpan setelah J hari itu: slot J tidak dibuat untuk hari itu (hitungan harian 0/1, bukan 0/2 dengan satu terlewat).
- **Disetujui PM 11 Nov 2026 (Q5):** perubahan jam langsung berlaku ketika disimpan. Jam yang dihapus tidak dapat dikonfirmasi lagi; jam baru hanya menghasilkan slot dengan J ≥ waktu pengaktifannya. Jam yang tidak berubah mempertahankan waktu aktif semula. Konfirmasi yang sudah tercatat tetap disimpan dan tetap dihitung pada tanggal jadwal asal, termasuk bila jamnya dihapus.
- **Hari minum (disetujui pengguna 14 Nov 2026):** mengikuti Q5. Hari yang dihapus tidak dapat dikonfirmasi lagi; hari baru hanya menghasilkan slot dengan J ≥ waktu pengaktifannya; konfirmasi lama tetap tersimpan.
- Hari berganti pukul 00.00 WIB.
- Jendela yang melintasi tengah malam tetap berlaku sampai J+120 inklusif; slot dan konfirmasinya tetap memakai tanggal jadwal asal (flow alt #19). Jadwal 00.00–03.59 memakai tanggal kalender saat jadwal itu terjadi.
- Kelompok waktu: Pagi 04.00–10.59, Siang 11.00–17.59, Malam 18.00–03.59.

`Nanti dulu` [PRD §19 #9]: pop-up tutup, kembali ke dashboard, status tetap `belum`, hitungan tidak bertambah, banner tetap tampil selama masih dalam jendela; pengguna bisa menekan kartu jadwal lagi nanti.

Hitungan progres per obat = dosis terkonfirmasi hari ini / total slot yang dibuat hari ini. Hanya bertambah setelah konfirmasi.

Hitungan harian memakai tanggal jadwal, bukan tanggal konfirmasi. Slot kemarin yang masih terbuka dan slot besok yang sudah terbuka dini ditampilkan terpisah; keduanya tidak masuk penyebut hari ini. Mengubah jadwal dapat mengubah total slot hari ini sesuai aturan Q5.

## 4. Tingkat verifikasi [PRD §9.5, §16 #3]
- `✓✓` (`scan_terverifikasi`): hasil scan **cocok** + pengguna menekan `Sudah saya minum`. Server mewajibkan `scanToken` HMAC (umur ±5 menit, berisi householdId, medicineId, slotId) dari hasil scan; klien tidak bisa mengklaim sendiri.
- `✓` (`dasar`): jalur "Sudah minum tanpa scan" dengan dialog konfirmasi (teks di `docs/02`).
- Dosis berstatus `sudah` **tidak menampilkan tombol konfirmasi lagi** (cegah minum ganda); batasan unik di database adalah pagar terakhir (konfirmasi ganda → 409).
- Wali harus bisa melihat beda ✓ dan ✓✓ pada tiap dosis.

## 5. Pencocokan hasil scan [PRD §9.4, §9.5, §10]
Normalisasi nama (oleh kode): huruf kecil, buang tanda baca dan spasi ganda, buang kata bentuk garam/sediaan (besilat/besylate, HCl, hidroklorida, natrium/sodium, tablet, kaplet, kapsul), samakan akhiran `-in`/`-ine` **[USULAN]**. Nama cocok bila salah satu nama terbaca sama dengan nama terdaftar setelah normalisasi. Kekuatan dibandingkan sebagai angka + satuan ("5mg" = "5 mg"; koma = titik desimal).

Urutan penentuan hasil:
1. Foto bukan kemasan / `legible=false` → `tidak_terbaca` (kalimat #9).
2. Tidak ada nama terdaftar yang cocok → `tidak_terdaftar` (kalimat #8). Jangan tampilkan tebakan AI.
3. Nama cocok tetapi kekuatan tidak terbaca → `kekuatan_tidak_terbaca`: minta foto ulang, jangan anggap cocok **[USULAN]**.
4. Nama cocok, kekuatan beda → `kekuatan_beda` (kalimat #7), tolak konfirmasi.
5. Nama dan kekuatan cocok:
   - dosis obat itu **sudah tercatat** di jadwal yang sama → `dosis_sudah_tercatat` (tanpa tombol konfirmasi) **[USULAN]**
   - ada dosis obat itu `jatuh_tempo` → `bisa_konfirmasi` (kalimat #4 lalu #5), menyertakan `scanToken`
   - ada dosis lain `jatuh_tempo` (obat lain) → `tunggu_dulu` (kalimat #6; sebut semua obat yang jatuh tempo, dipisah "dan"), tanpa tombol konfirmasi
   - tidak ada dosis jatuh tempo → `hanya_info`: tampilkan penjelasan terverifikasi + jadwal berikutnya (kalimat #3), tanpa konfirmasi **[USULAN: PRD tidak mendefinisikan kasus ini]**

Perutean ganda [PRD §19 #10]: kartu dosis/banner membuka `/scan?dosis=<slotId>` (mode verifikasi, `slotId` di-URL-encode); tombol besar "Scan Obat" di dashboard tidak membawa `slotId` dan kode yang memilih mode setelah AI membaca.

## 6. Pesan kegagalan [PRD §10 #12, NFR-04]
AI gagal / kuota habis / timeout (maksimum 15–20 detik): tampilkan kalimat #12 di `docs/02`; pengguna tetap bisa melihat jadwal dan konfirmasi tanpa scan (✓). Jangan pernah mengonfirmasi dosis karena scan yang gagal.

## 7. Persetujuan dan privasi [PRD §9.1, §9.4, §12.3]
- Daftar akun: wajib centang persetujuan penyimpanan data sebelum akun dibuat.
- Sebelum scan pertama: dialog persetujuan (kalimat #2), sekali per perangkat (`localStorage: hasSeenScanConsent`) **dan** dicatat di akun [PRD §19 #13].
- Foto: diproses di memori, tidak disimpan di database, storage, maupun log.
- Delapan pengaman AI gratis [PRD §12.3]: lihat `docs/04-ai-integration.md`.
- Data uji dan demo: kemasan milik tim/keluarga, fiktif; tidak ada data pasien sungguhan.

## 8. Akun demo juri [PRD §9.1]
Satu akun dengan data realistis (contoh: Amlodipin 5 mg jam 07.00 dan 19.00; Metformin 500 mg) dan persetujuan sudah tercatat; kredensial di `README.md`; tombol Quick Login Demo Juri di halaman login; `is_demo = true` sehingga tidak bisa dihapus. Jadwal demo harus tetap menghasilkan dosis `jatuh_tempo` yang bisa didemokan kapan saja (lihat P02: opsi jam relatif untuk demo).
