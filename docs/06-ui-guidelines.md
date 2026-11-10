# 06 · Pedoman UI/UX (ramah lansia)

Sumber: PRD §18, NFR-01/02, §9.3. Desain visual (warna, tipografi, tata letak) mengikuti **Figma** (`docs/09-figma.md`). Angka di bawah adalah **batas minimum aksesibilitas [USULAN]**: bila Figma lebih longgar, ikuti Figma; bila Figma lebih kecil dari minimum ini, ikuti minimum ini dan laporkan selisihnya ke PM.

## Prinsip (PRD §18)
1. **Teks selalu besar**, kontras tinggi: nama obat, jam, instruksi, dan pesan pop-up.
2. **Satu layar utama jelas**: begitu dibuka → banner jatuh tempo (bila ada), tombol besar "Scan Obat", kartu Pagi/Siang/Malam.
3. **Tombol "Bacakan"** besar dengan ikon suara pada setiap hasil scan, detail obat, dan peringatan.
4. **Status dibedakan lebih dari warna**: `belum`, `sudah`, `terlewat` memakai warna **dan** ikon **dan** label teks. `✓✓` (terverifikasi scan) dan `✓` (tanpa scan) tampil jelas pada dosis `sudah`, dengan keterangan teks, bukan hanya simbol.

## Angka minimum [USULAN]
| Hal | Minimum |
|---|---|
| Teks isi | 18 px (disarankan 20 px); teks penting/peringatan lebih besar |
| Tombol utama (Scan Obat, Bacakan, Sudah saya minum) | tinggi ≥ 56 px, lebar penuh di layar kecil |
| Target sentuh lain | ≥ 48 × 48 px, jarak antarsasaran ≥ 8 px |
| Kontras teks | ≥ 4,5:1 (usahakan 7:1 untuk teks isi dan tombol utama) |
| Lebar uji | 360–430 px (mobile-first); tablet/desktop tetap rapi |
| Satu tindakan utama per layar | ya |

## Perilaku yang wajib
- **Setiap kegagalan punya pesan dan jalan keluar** (jaringan, AI, kuota, kamera ditolak). Jangan membiarkan layar menggantung.
- **Loading AI** (hingga 20 detik): tampilkan indikator dan kalimat penjelas ("Sedang membaca foto…") [DRAFT], tombol batal, dan jangan mengunci seluruh layar.
- **Pop-up konfirmasi** (simpan obat, minum, tanpa scan, hapus): fokus berpindah ke dialog, `Esc`/tombol kembali menutup bila aman, tombol bahaya tidak menjadi default.
- **Suara**: hanya diputar setelah sentuhan pengguna (kebijakan browser). Pengingat "otomatis dibacakan" harus lewat tombol "Bacakan" yang menonjol bila browser menolak putar otomatis; bila suara id-ID tidak ada, tampilkan pesan D-d dan tetap tampilkan teks.
- **Teks dan suara identik**: yang dibacakan = yang tampil.
- **Tanpa iklan** di MVP. Bila kelak ada, dilarang di layar Scan, Konfirmasi Minum, dan Peringatan.
- Hindari: animasi cepat, teks di atas gambar tanpa kontras, ikon tanpa label, gestur tersembunyi (swipe-only), batas waktu otomatis yang menutup dialog penting.

## Aksesibilitas teknis
- Semantik HTML (`button`, `label`, `dialog`), label untuk setiap input, `aria-live="polite"` untuk banner pengingat dan hasil scan.
- Fokus terlihat jelas; urutan Tab logis; dialog menjebak fokus dengan benar (pakai komponen Radix/shadcn).
- Bahasa dokumen `lang="id"`.
- Hormati `prefers-reduced-motion`.
- Input kamera: `<input type="file" accept="image/*" capture="environment">`.

## Status visual (tetapkan di tema, jangan tersebar)
| Status | Label teks | Ikon | Warna (token) |
|---|---|---|---|
| belum_tiba / jatuh_tempo | `Belum` (jatuh tempo ditonjolkan dengan banner) | jam | netral/peringatan lembut |
| sudah ✓✓ | `Sudah, terverifikasi scan` | centang ganda | sukses |
| sudah ✓ | `Sudah, tanpa scan` | centang tunggal | sukses (lebih pucat) |
| terlewat | `Terlewat` | tanda seru | peringatan/bahaya |

Nilai warna aktual diambil dari Figma ke token tema (`frontend/src/styles` + konfigurasi Tailwind), tidak di-hardcode di komponen.
