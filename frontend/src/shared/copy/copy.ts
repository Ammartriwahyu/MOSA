// Satu-satunya sumber teks UI (CLAUDE.md aturan #4).
// Bagian BAKU disalin persis dari docs/02-copywriting-baku.md (nomor = baris tabel PRD §10).
// Jangan memparafrase; mengubah satu kalimat baku harus lewat PM.
// Bagian DRAFT belum disetujui tim: setiap entri ditandai `// DRAFT` dan dilaporkan.
// Backend mengirim data terstruktur; kalimat dirakit di sini. Teks yang dibacakan = teks yang tampil.

// ─── Format ───────────────────────────────────────────────────────────────

/** Jam ditulis dengan titik: "07:00" → "07.00" (docs/02 aturan implementasi). */
export function formatJam(jam: string): string {
  return jam.replace(":", ".");
}

/** Kekuatan ditulis dengan spasi: "5mg" → "5 mg". Teks lain dibiarkan apa adanya. */
export function formatKekuatan(kekuatan: string): string {
  const trimmed = kekuatan.trim();
  const match = /^(\d+(?:[.,]\d+)?)\s*([^\d\s].*)$/.exec(trimmed);
  return match ? `${match[1]} ${match[2]}` : trimmed;
}

/** Aturan pakai di tengah kalimat: huruf awal kecil, tanpa titik di akhir ("Sesudah makan." → "sesudah makan"). */
function aturanDalamKalimat(aturan: string): string {
  const trimmed = aturan.trim().replace(/[.\s]+$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

const obat = (nama: string, kekuatan: string) => `${nama.trim()} ${formatKekuatan(kekuatan)}`;

// ─── Tipe data dari backend ───────────────────────────────────────────────

export type KelompokWaktu = "pagi" | "siang" | "malam";

/** `nextDose` dari backend (docs/02 "Penyusunan kalimat jadwal berikutnya"). */
export type JadwalBerikutnya = {
  tanggal: "hari_ini" | "besok";
  kelompok: KelompokWaktu;
  /** "HH:mm" WIB */
  jam: string;
};

export type ObatJatuhTempo = { nama: string; kekuatan: string };

// ─── BAKU (docs/02) ───────────────────────────────────────────────────────

export const TOMBOL = {
  yaSudahBenar: "Ya, sudah benar",
  perbaikiLagi: "Perbaiki lagi",
  sudahSayaMinum: "Sudah saya minum",
  nantiDulu: "Nanti dulu",
  /** #10 [REKOMENDASI PM; D6] */
  batal: "Batal",
  /** B3 */
  scanObat: "Scan Obat",
  /** B4 */
  bacakan: "Bacakan",
} as const;

export const LABEL = {
  /** B2 */
  diisiApoteker: "Diisi apoteker",
  diisiKeluarga: "Diisi keluarga",
  /** B5 */
  kegunaanObat: "Kegunaan Obat",
  /** #11: tidak ada kalimat baku, pakai label status ini. */
  terlewat: "Terlewat",
} as const;

/** #1 Pop-up konfirmasi simpan obat. Tombol: TOMBOL.yaSudahBenar / TOMBOL.perbaikiLagi. */
export const KONFIRMASI_SIMPAN_OBAT =
  "Periksa sekali lagi, ya. Pastikan nama obat, dosis, dan jadwal di bawah ini sudah sesuai resep. Informasi ini akan menjadi panduan minum obat setiap hari.";

/** #2 Persetujuan sebelum scan pertama. */
export const PERSETUJUAN_SCAN =
  "Foto obat akan dikirim ke layanan AI untuk dibaca. Foto tidak kami simpan. Hindari memotret bagian yang berisi nama atau data pribadi.";

const FRASA_WAKTU: Record<JadwalBerikutnya["tanggal"], Record<KelompokWaktu, string>> = {
  hari_ini: { pagi: "pagi ini", siang: "siang ini", malam: "malam ini" },
  besok: { pagi: "besok pagi", siang: "besok siang", malam: "besok malam" },
};

/**
 * #3 Scan lihat info, cocok: "Obat ini perlu diminum lagi malam ini pukul 19.00."
 * Bila tidak ada jadwal berikutnya (null): kalimat DRAFT.
 */
export function jadwalBerikutnya(next: JadwalBerikutnya | null): string {
  if (next === null) return DRAFT.tidakAdaJadwalBerikutnya;
  return `Obat ini perlu diminum lagi ${FRASA_WAKTU[next.tanggal][next.kelompok]} pukul ${formatJam(next.jam)}.`;
}

/** #4 Scan verifikasi, hasil benar. */
export function verifikasiBenar(p: {
  nama: string;
  kekuatan: string;
  jam: string;
  jumlah: string;
  aturan: string;
}): string {
  return `Obat sudah sesuai. Ini ${obat(p.nama, p.kekuatan)} untuk jadwal pukul ${formatJam(p.jam)}. Minum ${p.jumlah.trim()} ${aturanDalamKalimat(p.aturan)}.`;
}

/** #5 Pop-up konfirmasi minum. Tombol: TOMBOL.sudahSayaMinum / TOMBOL.nantiDulu. */
export const KONFIRMASI_MINUM = "Apakah obat ini sudah diminum?";

/** #6 Salah obat / bukan jadwal sekarang. Lebih dari satu obat jatuh tempo dipisah " dan ". */
export function tungguDulu(p: {
  nama: string;
  kekuatan: string;
  jam: string;
  jatuhTempo: ObatJatuhTempo[];
}): string {
  const sekarang = p.jatuhTempo.map((o) => obat(o.nama, o.kekuatan)).join(" dan ");
  return `Tunggu dulu. Ini ${obat(p.nama, p.kekuatan)} untuk jadwal pukul ${formatJam(p.jam)}. Obat untuk sekarang adalah ${sekarang}.`;
}

/** #7 Nama sama, kekuatan beda. Nama dari data terdaftar (pencocokan oleh kode). */
export function kekuatanBeda(p: {
  nama: string;
  kekuatanTerbaca: string;
  kekuatanTerdaftar: string;
}): string {
  return `Hati-hati. Obat ini ${obat(p.nama, p.kekuatanTerbaca)}, sedangkan yang terdaftar ${obat(p.nama, p.kekuatanTerdaftar)}. Tanyakan ke apoteker sebelum diminum.`;
}

/** #8 Obat belum terdaftar. */
export const OBAT_BELUM_TERDAFTAR =
  "Obat ini belum ada di daftar Anda. Minta apoteker atau keluarga untuk mendaftarkannya.";

/** #9 Foto tanpa kemasan / nama tidak terlihat. */
export const NAMA_BELUM_TERLIHAT =
  "Nama obatnya belum terlihat. Coba foto bungkus atau plastik obatnya, bagian yang ada tulisan namanya.";

/** #10 "Sudah minum tanpa scan". Tombol: TOMBOL.sudahSayaMinum / TOMBOL.batal. */
export function konfirmasiTanpaScan(p: { nama: string; kekuatan: string }): string {
  return `Anda mencatat obat ini tanpa foto kemasan. Apakah obat ${obat(p.nama, p.kekuatan)} benar sudah diminum?`;
}

/** #12 AI gagal / kuota habis [REKOMENDASI PM]. */
export const AI_GAGAL =
  "Maaf, pembaca foto obat sedang istirahat sebentar. Silakan coba foto lagi nanti, atau lihat jadwal dan catat minum obat langsung dari halaman utama.";

/** B1 Banner pengingat dosis jatuh tempo: "Sekarang waktunya minum Amlodipin." */
export function bannerJatuhTempo(nama: string): string {
  return `Sekarang waktunya minum ${nama.trim()}.`;
}

/** B6 Kalimat pitching, untuk halaman "Tentang" bila dibuat. */
export const KALIMAT_PITCHING =
  "Untuk prototipe lomba, kami memakai layanan AI tier gratis dengan data uji tanpa identitas pengguna: foto tidak disimpan dan pengguna diberi tahu sebelum memakai fitur scan. Pada versi produksi, kami beralih ke layanan AI berbayar yang tidak memakai data pengguna untuk melatih model, dengan biaya yang ditutup melalui partnership dan iklan.";

/** Nama aplikasi di UI (keputusan D7). */
export const NAMA_APLIKASI = "TepatMinum";
export const SUB_LABEL_APLIKASI = "MOSA";

// ─── DRAFT: belum disetujui tim ───────────────────────────────────────────

export const DRAFT = {
  /** D-a lanjutan bila tidak ada dosis berikutnya. */ // DRAFT
  tidakAdaDosisBerikutnya: "Tidak ada dosis berikutnya hari ini.", // DRAFT
  /** D-b Kekuatan tidak terbaca. */ // DRAFT
  kekuatanBelumTerlihat:
    "Kekuatan obatnya belum terlihat. Coba foto lagi, bagian yang ada tulisan kekuatannya.", // DRAFT
  /** D-c AI gagal saat simpan obat. */ // DRAFT
  penjelasanBelumTersedia: "Penjelasan sederhana belum tersedia.", // DRAFT
  /** D-d Suara bahasa Indonesia tidak tersedia. */ // DRAFT
  suaraTidakTersedia:
    "Suara bahasa Indonesia belum tersedia di HP ini. Teks tetap bisa dibaca di layar.", // DRAFT
  /** D-f Kotak centang persetujuan data saat daftar. */ // DRAFT
  persetujuanData: "Saya setuju data obat saya disimpan di aplikasi ini.", // DRAFT
  /** Kalimat #3 bila nextDose = null (docs/02 "Penyusunan kalimat jadwal berikutnya"). */ // DRAFT
  tidakAdaJadwalBerikutnya: "Tidak ada jadwal minum berikutnya untuk obat ini.", // DRAFT
  /** D-g Hapus seluruh data & akun: judul dan penjelasan dari Figma MOSA DRAFT A10. */ // DRAFT
  hapusAkunJudul: "Hapus seluruh data dan akun?", // DRAFT
  hapusAkunPenjelasan:
    "Semua data obat, jadwal, dan riwayat minum akan dihapus permanen dari semua HP yang memakai akun ini.", // DRAFT
  /** docs/06: kalimat penjelas saat AI membaca foto. */ // DRAFT
  sedangMembacaFoto: "Sedang membaca foto…", // DRAFT
  /** docs/01 §2 [USULAN]: petunjuk di bawah kolom Aturan Pakai. */ // DRAFT
  petunjukAturanPakai: "Tulis hubungan dengan makan saja, tanpa jam. Contoh: sesudah makan.", // DRAFT
  /** docs/01 §2 [USULAN]: isian tegas kolom Larangan bila tidak ada. */ // DRAFT
  tidakAdaLarangan: "Tidak ada larangan khusus", // DRAFT
  /** Label aksesibel tombol tutup dialog (tidak terlihat). */ // DRAFT
  tutup: "Tutup", // DRAFT
  /** Label aksesibel indikator memuat. */ // DRAFT
  memuat: "Memuat…", // DRAFT
  /** Navigasi bawah (Figma MOSA DRAFT 05). Tombol tengah memakai TOMBOL.scanObat (B3). */ // DRAFT
  navJadwal: "Jadwal", // DRAFT
  navObat: "Obat", // DRAFT
  /** Label aksesibel wilayah navigasi bawah. */ // DRAFT
  navigasiUtama: "Navigasi utama", // DRAFT
  /** Label aksesibel tombol ikon di header (Figma: panah kiri, roda gigi). */ // DRAFT
  kembali: "Kembali", // DRAFT
  pengaturan: "Pengaturan", // DRAFT
  /** Deskripsi aplikasi untuk metadata halaman (sub-label MOSA, keputusan D7). */ // DRAFT
  deskripsiAplikasi: "MOSA: Medication Organizer, Scanner & Assistant", // DRAFT
} as const;

/** Pilihan keluaran Teks/Suara (Figma MOSA DRAFT 09 · 135:2902; label pilihan dari PRD §9.6). */
export const PREFERENSI = {
  judulLayar: "Pilihan Tampilan", // DRAFT
  pertanyaan: "Pilih cara menerima informasi obat", // DRAFT
  teksSaja: "Teks saja", // PRD §9.6
  teksSajaKeterangan: "Informasi mudah dibaca di layar.", // DRAFT
  teksSuara: "Teks + Suara Otomatis", // PRD §9.6
  teksSuaraKeterangan: "Dibacakan setelah sentuhan layar.", // DRAFT
  catatanUbah: "Pilihan ini dapat diubah dari Informasi Obat.", // DRAFT
  simpanLihatHasil: "Simpan & Lihat Hasil", // DRAFT
  simpanPilihan: "Simpan Pilihan", // DRAFT
} as const;

/** Pengaturan (Figma MOSA DRAFT 22 · 135:4687) dan pop-up hapus akun (A10 · 135:5854). */
export const PENGATURAN = {
  judul: "Pengaturan", // DRAFT
  caraMenampilkan: "Cara menampilkan informasi", // DRAFT
  teksSajaKeterangan: "Huruf besar di layar", // DRAFT
  teksSuaraKeterangan: "Dibacakan setelah Anda menyentuh layar", // DRAFT
  tersimpan: "Pilihan tersimpan.", // DRAFT
  akunBersama: "Akun bersama", // DRAFT
  labelNama: "Nama", // DRAFT
  labelEmail: "Email", // DRAFT
  labelTetapMasuk: "Tetap masuk", // DRAFT
  tetapMasukAktif: "Aktif di HP ini", // DRAFT
  dataPrivasi: "Data dan privasi", // DRAFT
  privasiFoto: "Foto obat tidak disimpan", // DRAFT
  privasiAi: "Nama dan identitas tidak dikirim ke AI", // DRAFT
  hapusAkun: "Hapus Seluruh Data & Akun", // DRAFT
  yaHapusSemua: "Ya, hapus semua", // DRAFT
  demoDilindungi: "Akun demo juri dilindungi dan tidak bisa dihapus.", // DRAFT
  labelKataSandiUlang: "Masukkan ulang kata sandi", // DRAFT
  galatKataSandiHapus: "Kata sandi salah. Data tidak dihapus.", // DRAFT
} as const;

/** Layar masuk, daftar, onboarding, persetujuan (Figma MOSA DRAFT 01–03). Semua DRAFT. */
export const AUTH = {
  tagline: "MOSA · Pendamping Minum Obat", // DRAFT
  onboardingJudul: "Minum obat tepat waktu", // DRAFT
  onboardingIsi: "Bantu lansia dan keluarga mengikuti instruksi obat dari apoteker.", // DRAFT
  mulaiSekarang: "Mulai Sekarang", // DRAFT
  /** Ilustrasi onboarding (dekoratif, disembunyikan dari pembaca layar). */
  ilustrasiJadwal: "Pagi · 07.00", // DRAFT
  ilustrasiObat: "Amlodipin 5 mg", // DRAFT
  ilustrasiStatus: "Sudah", // DRAFT
  sudahPunyaAkun: "Sudah punya akun?", // DRAFT
  masuk: "Masuk", // DRAFT
  masukJudul: "Masuk ke akun keluarga", // DRAFT
  masukIsi: "Satu akun dipakai bersama oleh lansia dan keluarga, dari HP masing-masing.", // DRAFT
  tetapMasuk: "Anda tetap masuk di HP ini. Tidak perlu masuk berulang kali.", // DRAFT
  belumPunyaAkun: "Belum punya akun?", // DRAFT
  daftarAkunBaru: "Daftar akun baru", // DRAFT
  daftarJudul: "Daftar Akun", // DRAFT
  daftarIsi: "Buat satu akun untuk dipakai bersama oleh lansia dan keluarga.", // DRAFT
  labelNamaPasien: "Nama pasien", // DRAFT
  labelEmail: "Email", // DRAFT
  labelKataSandi: "Kata sandi", // DRAFT
  labelUlangiKataSandi: "Ulangi kata sandi", // DRAFT
  /** Keterangan di bawah kotak persetujuan (kalimat utama = DRAFT.persetujuanData, D-f). */
  persetujuanKeterangan: "Data hanya bisa dilihat pemilik akun dan bisa dihapus kapan saja.", // DRAFT
  buatAkun: "Buat Akun", // DRAFT
  persetujuanJudul: "Persetujuan data", // DRAFT
  persetujuanIsi: "Sebelum memakai aplikasi, setujui penyimpanan data obat di akun ini.", // DRAFT
  setujuLanjutkan: "Setuju dan lanjutkan", // DRAFT
  keluar: "Keluar dari Akun", // DRAFT
  /** Quick Login Demo Juri (Figma 02 · 135:2825). */
  masukDemo: "Masuk dengan Akun Demo Juri", // DRAFT
  atau: "atau", // DRAFT
  /** Penanda akun demo di aplikasi (P08 tugas 2; tidak ada di Figma). */
  modeDemo: "Akun Demo Juri: data contoh, tidak bisa dihapus.", // DRAFT
  // Galat formulir dan masuk
  galatNama: "Isi nama pasien.", // DRAFT
  galatEmail: "Isi email yang benar, misalnya nama@email.com.", // DRAFT
  galatKataSandiPendek: "Kata sandi minimal 8 karakter.", // DRAFT
  galatKataSandiBeda: "Kata sandi tidak sama.", // DRAFT
  galatPersetujuan: "Centang persetujuan untuk membuat akun.", // DRAFT
  galatKataSandiKosong: "Isi kata sandi.", // DRAFT
  galatMasuk: "Email atau kata sandi salah.", // DRAFT
  galatEmailBelumDikonfirmasi: "Email belum dikonfirmasi. Buka email Anda, lalu masuk lagi.", // DRAFT
  galatSudahTerdaftar: "Email ini sudah terdaftar. Silakan masuk.", // DRAFT
  galatKataSandiLemah: "Kata sandi terlalu mudah ditebak. Pakai kata sandi lain.", // DRAFT
  galatJaringan: "Tidak dapat terhubung. Periksa internet, lalu coba lagi.", // DRAFT
  galatUmum: "Terjadi kesalahan. Coba lagi sebentar lagi.", // DRAFT
  cekEmail: "Akun dibuat. Buka email Anda untuk konfirmasi, lalu masuk.", // DRAFT
  cobaLagi: "Coba lagi", // DRAFT
} as const;

/** Nama kelompok waktu (docs/01: Pagi 04.00–10.59, Siang 11.00–17.59, Malam 18.00–03.59). */
const NAMA_KELOMPOK: Record<KelompokWaktu, string> = { pagi: "Pagi", siang: "Siang", malam: "Malam" };

/** Kelompok waktu dari jam "HH:mm" (docs/01). Hanya untuk tampilan; jadwal dihitung backend. */
export function kelompokWaktu(jam: string): KelompokWaktu {
  const menit = Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3, 5));
  if (menit >= 4 * 60 && menit < 11 * 60) return "pagi";
  if (menit >= 11 * 60 && menit < 18 * 60) return "siang";
  return "malam";
}

/** Jam minum untuk daftar/detail: ["07:00","19:00"] → "Pagi 07.00 · Malam 19.00" (Figma 16, 21). */
export function formatJamMinum(jam: readonly string[]): string {
  return jam.map((j) => `${NAMA_KELOMPOK[kelompokWaktu(j)]} ${formatJam(j)}`).join(" · ");
}

/** Daftar dan detail obat (Figma MOSA DRAFT 16 · 135:4138, 21 · 135:4576). */
export const OBAT = {
  judulDaftar: "Daftar Obat", // DRAFT
  tambahObat: "Tambah Obat", // DRAFT
  kosongJudul: "Belum ada obat", // DRAFT
  kosongPesan: "Tambahkan obat pertama agar jadwal minum muncul di layar Jadwal.", // DRAFT
  judulDetail: "Detail Obat", // DRAFT
  penjelasanSederhana: "Penjelasan Sederhana", // DRAFT
  penjelasanDiperiksa: "Dibuat AI dan sudah diperiksa saat disimpan", // DRAFT
  informasiAsli: "Informasi asli pengisi", // DRAFT
  aturanPakai: "Aturan pakai", // DRAFT
  jumlahPerMinum: "Jumlah per minum", // DRAFT
  jamMinum: "Jam minum", // DRAFT
  larangan: "Larangan / peringatan", // DRAFT
  catatanPribadi: "Catatan pribadi", // DRAFT
  bukanSaranMedis:
    "Informasi ini berasal dari data yang diisi apoteker atau keluarga. Aplikasi tidak memberi saran medis.", // DRAFT
  ubahPilihanKeluaran: "Ubah pilihan teks / suara", // DRAFT
  tidakDitemukan: "Obat tidak ditemukan", // DRAFT
  tidakDitemukanPesan: "Obat ini mungkin sudah dihapus.", // DRAFT
  kembaliKeDaftar: "Kembali ke Daftar Obat", // DRAFT
} as const;

/** Label pilihan jam: "07:00" → "Pagi · 07.00" (Figma 17). */
export function labelJamMinum(jam: string): string {
  return `${NAMA_KELOMPOK[kelompokWaktu(jam)]} · ${formatJam(jam)}`;
}

/** Formulir Tambah/Ubah Obat (Figma MOSA DRAFT 17 · 135:4216). Label kolom memakai LABEL/OBAT. */
export const FORM_OBAT = {
  catatanIsi: "Isi sesuai resep atau etiket obat. Pilih sumber informasi sebelum melanjutkan.", // DRAFT
  siapaMengisi: "Siapa yang mengisi?", // DRAFT
  siapaMengisiPetunjuk: "Pilih sesuai orang yang mengisi data obat.", // DRAFT
  dataObat: "Data obat", // DRAFT
  namaObat: "Nama obat", // DRAFT
  namaPetunjuk: "Pilih dari daftar atau tulis nama seperti yang tertera di kemasan.", // DRAFT
  kekuatan: "Kekuatan", // DRAFT
  kekuatanPetunjuk: "Salin angka dan satuan kekuatan pada kemasan.", // DRAFT
  jamBisaDiubah: "Jam bisa diubah sesuai resep", // DRAFT
  ubahJam: "Ubah jam", // DRAFT
  jamLain: "Jam lain", // DRAFT
  tambahJam: "Tambah jam lain", // DRAFT
  privasiPetunjuk: "Jangan tulis nama atau data pribadi pasien di sini.", // DRAFT
  catatanOpsional: "Catatan pribadi (opsional)", // DRAFT
  catatanContoh: "Contoh: simpan di kotak obat biru", // DRAFT
  kirimAi: "Hanya aturan pakai, peringatan, dan catatan dikirim ke AI. Jangan tulis identitas pasien.", // DRAFT
  lanjut: "Lanjut: Periksa Data", // DRAFT
  galatWajib: "Kolom ini wajib diisi.", // DRAFT
  galatKekuatan: "Tulis angka dan satuannya, misalnya 5 mg.", // DRAFT
  galatPanjang: "Tulisan terlalu panjang.", // DRAFT
  galatSumber: "Pilih siapa yang mengisi.", // DRAFT
  galatJamMinimal: "Pilih minimal satu jam minum.", // DRAFT
  galatJamKosong: "Isi jamnya.", // DRAFT
  galatJamSama: "Jam minum tidak boleh sama.", // DRAFT
  galatRingkas: "Ada isian yang perlu diperbaiki.", // DRAFT
} as const;

/** Tambah Obat: Figma 18, 19, B22; kalimat utama dialog memakai KONFIRMASI_SIMPAN_OBAT. */
export const SIMPAN_OBAT = {
  menyiapkan: "Menyiapkan penjelasan sederhana…", // DRAFT
  prosesIsi: "AI sedang menyederhanakan instruksi obat. Hanya data obat yang dikirim, tanpa nama atau data pribadi.", // DRAFT
  periksaJudul: "Periksa data obat", // DRAFT
  dataAsli: "Data asli", // DRAFT
  sumber: "Sumber", // DRAFT
  penjelasanAi: "Penjelasan sederhana (dibuat AI)", // DRAFT
  tanpaAi: "Data tetap bisa disimpan tanpa penjelasan AI. Panduan minum memakai teks asli pengisi.", // DRAFT
  menyimpan: "Menyimpan obat…", // DRAFT
  galatSimpan: "Obat belum berhasil disimpan. Periksa koneksi, lalu coba lagi.", // DRAFT
  galatValidasi: "Data obat belum dapat disimpan. Pilih Perbaiki lagi dan periksa isian sesuai resep.", // DRAFT
  berhasil: "Obat berhasil disimpan", // DRAFT
  baru: "Baru", // DRAFT
} as const;

/** Ubah/hapus: MOSA DRAFT B7, B20, A9, B25. */
export const UBAH_OBAT = {
  judul: "Ubah data obat", // DRAFT
  tombol: "Ubah Data Obat", // DRAFT
  petunjuk: "Perubahan jadwal langsung berlaku. Riwayat minum yang sudah tercatat tetap tersimpan.", // DRAFT, keputusan PM Q5
  periksaJudul: "Periksa perubahan obat", // DRAFT
  berhasil: "Perubahan obat berhasil disimpan", // DRAFT
  hapus: "Hapus Obat", // DRAFT
  hapusJudul: "Hapus obat ini?", // DRAFT
  hapusPenjelasan: "Obat dinonaktifkan dan jadwal berikutnya dihentikan. Riwayat konsumsi tetap tersimpan. Tindakan ini tidak bisa dibatalkan.", // DRAFT D-g
  yaHapus: "Ya, hapus obat", // DRAFT
  menghapus: "Menonaktifkan obat…", // DRAFT
  galatHapus: "Obat belum berhasil dinonaktifkan. Periksa koneksi, lalu coba lagi.", // DRAFT
  dinonaktifkan: "Obat dinonaktifkan", // DRAFT
  dinonaktifkanIsi: "Jadwal berikutnya dihentikan. Riwayat konsumsi tetap tersimpan.", // DRAFT
} as const;

/** "3 obat terdaftar" (Figma 16). */ // DRAFT
export function jumlahObatTerdaftar(jumlah: number): string {
  return `${jumlah} obat terdaftar`; // DRAFT
}

/** docs/06 [USULAN]: label status dosis (selalu bersama ikon dan warna). "Terlewat" baku (#11). */
export const LABEL_STATUS = {
  belum: "Belum", // DRAFT
  sudahScan: "Sudah, terverifikasi scan", // DRAFT
  sudahTanpaScan: "Sudah, tanpa scan", // DRAFT
  terlewat: LABEL.terlewat,
} as const;

/** D-a Scan obat yang dosisnya sudah tercatat. */ // DRAFT
export function dosisSudahTercatat(p: { nama: string; jam: string; jamBerikutnya: string | null }): string {
  const awal = `Dosis ${p.nama.trim()} pukul ${formatJam(p.jam)} sudah tercatat diminum.`; // DRAFT
  return p.jamBerikutnya === null
    ? `${awal} ${DRAFT.tidakAdaDosisBerikutnya}`
    : `${awal} Dosis berikutnya pukul ${formatJam(p.jamBerikutnya)}.`; // DRAFT
}
