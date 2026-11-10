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
} as const;

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
