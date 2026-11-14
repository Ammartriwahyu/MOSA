// Satu-satunya sumber teks UI (CLAUDE.md aturan #4).
// Bagian BAKU disalin persis dari docs/02-copywriting-baku.md (nomor = baris tabel PRD §10).
// Jangan memparafrase; mengubah satu kalimat baku harus lewat PM.
// Bagian DRAFT belum disetujui tim: setiap entri ditandai `// DRAFT` dan dilaporkan.
// Backend mengirim data terstruktur; kalimat dirakit di sini. Teks yang dibacakan = teks yang tampil.

// ─── Format ───────────────────────────────────────────────────────────────
/** P14: teks izin, pemasangan dan notifikasi netral. */
export const PUSH = {
  heading: "Pengingat di HP ini", // DRAFT
  explanation: "Izinkan notifikasi agar HP ini dapat menerima pengingat. Pengingat bisa terlambat atau tidak muncul. Tetap periksa jadwal di aplikasi.", // DRAFT
  enable: "Aktifkan pengingat", // DRAFT
  disable: "Matikan pengingat", // DRAFT
  enabled: "Pengingat aktif di HP ini.", // DRAFT
  disabled: "Pengingat tidak aktif di HP ini.", // DRAFT
  preparing: "Menyiapkan pengingat…", // DRAFT
  busy: "Menyimpan pilihan pengingat…", // DRAFT
  denied: "Izin notifikasi ditolak. Jika ingin mengaktifkannya, ubah izin situs ini melalui pengaturan browser atau HP, lalu coba lagi.", // DRAFT
  unsupported: "Browser ini belum mendukung pengingat. Anda tetap dapat melihat jadwal di aplikasi.", // DRAFT
  unavailable: "Pengingat belum tersedia. Anda tetap dapat melihat jadwal di aplikasi.", // DRAFT
  failed: "Pilihan pengingat belum tersimpan. Periksa koneksi, lalu coba lagi.", // DRAFT
  cancelled: "Pilihan pengingat berubah. Periksa kembali pengaturan di HP ini.", // DRAFT
  retry: "Periksa lagi", // DRAFT
  installHeading: "Pasang di layar utama", // DRAFT
  install: "Pasang aplikasi", // DRAFT
  installed: "Aplikasi sudah dibuka dari layar utama.", // DRAFT
  installHint: "Gunakan pilihan Pasang aplikasi atau Tambahkan ke layar utama pada menu browser. Aplikasi tetap memerlukan internet.", // DRAFT
  iosHint: "Di iPhone atau iPad, buka aplikasi ini di Safari, pilih Bagikan, lalu Tambahkan ke Layar Utama. Buka dari layar utama untuk mengaktifkan pengingat.", // DRAFT
  notificationTitle: "Pengingat MOSA", // DRAFT
  notificationBody: "Buka aplikasi untuk memeriksa jadwal Anda.", // DRAFT
} as const;

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

export const SUARA = {
  stop: "Berhenti", // DRAFT
  checking: "Memeriksa suara bahasa Indonesia…", // DRAFT
  starting: "Menyiapkan suara…", // DRAFT
  speaking: "Sedang membacakan teks.", // DRAFT
  blocked: "Suara belum dapat diputar. Ketuk Bacakan untuk mencoba lagi. Teks tetap bisa dibaca di layar.", // DRAFT
  failed: "Suara belum dapat diputar. Coba lagi atau baca teks di layar.", // DRAFT
  readable: "Informasi tetap bisa dibaca", // DRAFT: Figma B8
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

/** Capture P11: teks tambahan dari Figma/keadaan gagal, belum disetujui PM. */
export const SCAN_CAPTURE = {
  consentTitle: "Sebelum memotret obat", // DRAFT
  agree: "Saya mengerti, lanjut", // DRAFT
  goodPackage: "Foto bungkus, strip, atau plastik obat", // DRAFT
  avoidLabel: "Jangan foto etiket yang berisi nama pasien", // DRAFT
  deviceNote: "Persetujuan diminta pada setiap HP yang digunakan.", // DRAFT
  savingConsent: "Menyimpan persetujuan…", // DRAFT
  consentFailed: "Persetujuan belum dapat disimpan. Periksa koneksi, lalu coba lagi.", // DRAFT
  loadFailed: "Persetujuan scan belum dapat diperiksa.", // DRAFT
  checkingConsent: "Memeriksa persetujuan scan…", // DRAFT
  backToSchedule: "Kembali ke Jadwal", // DRAFT
  retry: "Coba lagi", // DRAFT
  camera: "Ambil foto dengan kamera", // DRAFT
  cameraHint: "Ketuk untuk memotret", // DRAFT
  upload: "Unggah Foto", // DRAFT
  retake: "Foto ulang", // DRAFT
  another: "Pilih foto lain", // DRAFT
  close: "Tutup scan dan kembali ke jadwal", // DRAFT
  genericMode: "Scan kemasan obat", // DRAFT: mode ditentukan backend setelah membaca, bukan selalu lihat info
  selectedMode: "Untuk jadwal yang Anda pilih", // DRAFT
  instruction: "Pastikan nama dan kekuatan obat pada kemasan terlihat jelas.", // DRAFT
  empty: "Foto kemasan akan tampil di sini.", // DRAFT
  processing: "Menyiapkan foto…", // DRAFT
  ready: "Foto siap diperiksa", // DRAFT
  review: "Periksa nama dan kekuatan pada foto. Hindari bagian yang berisi data pribadi.", // DRAFT
  preview: "Pratinjau foto kemasan pilihan Anda", // DRAFT
  unsupported: "Pilih foto JPEG, PNG, atau WebP. Jika foto tidak bisa dibuka, ambil ulang dengan kamera.", // DRAFT
  tooLarge: "Foto ini terlalu besar untuk diproses. Ambil ulang dengan resolusi lebih kecil.", // DRAFT
  unreadable: "Foto belum bisa dibuka. Ambil ulang atau pilih foto lain.", // DRAFT
  compressionFailed: "Foto belum berhasil disiapkan. Ambil ulang atau pilih foto lain.", // DRAFT
  invalidTarget: "Jadwal pada tautan ini tidak valid. Kembali ke jadwal dan pilih dosis lagi.", // DRAFT
} as const;

/** Pengiriman scan P11; kalimat #12 tetap AI_GAGAL persis. */
export const SCAN_REQUEST = {
  usePhoto: "Gunakan Foto Ini", // DRAFT
  reading: "Sedang membaca kemasan obat…", // DRAFT: Figma 08/14
  waiting: "Mohon tunggu sebentar. Foto tidak kami simpan.", // DRAFT: Figma 08/14
  cancelHint: "Batal menghentikan penantian di HP ini. Foto yang sudah terkirim mungkin tetap diproses dan jatah scan dapat terpakai.", // DRAFT
  cancelled: "Pemindaian dibatalkan di HP ini. Tidak ada dosis yang dicatat.", // DRAFT
  failedTitle: "Foto belum dapat diperiksa", // DRAFT
  consent: "Persetujuan scan perlu diperiksa lagi sebelum mengirim foto.", // DRAFT
  session: "Sesi Anda sudah berakhir. Silakan masuk lagi.", // DRAFT
  target: "Jadwal yang dipilih sudah tidak tersedia. Kembali ke jadwal dan pilih dosis lagi.", // DRAFT
  invalid: "Pemindaian belum dapat diproses. Pilih foto lain atau periksa data obat dan jadwal Anda.", // DRAFT
  again: "Foto lagi", // DRAFT
} as const;

/** Hasil scan P11. Teks tambahan Figma/keadaan tanpa frame; belum disetujui PM. */
export const SCAN_OUTCOME = {
  title: "Hasil Scan", // DRAFT
  infoTitle: "Informasi Obat", // DRAFT
  matched: "Obat sudah sesuai", // DRAFT
  unreadable: "Foto belum bisa dibaca", // DRAFT
  unregistered: "Obat belum terdaftar", // DRAFT
  missingStrength: "Kekuatan obat belum terbaca", // DRAFT
  differentStrength: "Hati-hati, kekuatan obat berbeda", // DRAFT
  wait: "Tunggu dulu", // DRAFT
  recorded: "Dosis sudah tercatat", // DRAFT
  matching: "Hasil pencocokan", // DRAFT
  name: "Nama obat", // DRAFT
  strength: "Kekuatan", // DRAFT
  schedule: "Jadwal dosis", // DRAFT
  photographed: "Kekuatan yang terbaca", // DRAFT
  registered: "Yang terdaftar", // DRAFT
  currentMedicines: "Obat untuk sekarang", // DRAFT
  chooseSlot: "Pilih jadwal dosis", // DRAFT
  chooseSlotHint: "Ada beberapa jadwal untuk obat ini. Pilih satu jadwal dosis yang Anda maksud.", // DRAFT
  noNewDose: "Tidak ada dosis yang dicatat dari pemeriksaan foto ini.", // DRAFT
  noConfirmation: "Tidak perlu dikonfirmasi lagi", // DRAFT
  viewInfo: "Lihat Informasi Obat", // DRAFT
  backToResult: "Kembali ke Hasil Scan", // DRAFT
  retryPhoto: "Foto Ulang Kemasan", // DRAFT
  correctPhoto: "Foto Obat yang Benar", // DRAFT
  goodPhoto: "Foto strip, bungkus, atau plastik yang ada tulisan nama obat", // DRAFT
  avoidLoosePills: "Foto butir tablet atau kapsul saja", // DRAFT
} as const;

export const SCAN_CONFIRM = {
  continue: "Lanjut: Catat Minum Obat", // DRAFT
  saving: "Mencatat minum obat…", // DRAFT
  hint: "Konfirmasi yang berhasil dicatat sebagai Sudah ✓✓ melalui scan. Nanti dulu tidak menyimpan konfirmasi; scan ulang saat siap.", // DRAFT
  expired: "Hasil scan ini sudah tidak berlaku. Foto ulang kemasan untuk memeriksa jadwal terbaru.", // DRAFT
  changed: "Jadwal atau data obat sudah berubah. Kembali ke jadwal untuk memeriksa dosis ini.", // DRAFT
  uncertain: "Hasil pencatatan belum dapat dipastikan. Periksa jadwal sebelum mencoba lagi.", // DRAFT
  already: "Dosis ini sudah tercatat. Periksa jadwal untuk melihat metode pencatatannya.", // DRAFT
  saved: "Minum obat berhasil dicatat", // DRAFT
  rescan: "Scan ulang", // DRAFT
} as const;

/** DRAFT: #6 membutuhkan jam. Bila server tidak punya nextDose, jangan menebak jamnya. */
export function tungguDuluTanpaJadwal(p: { nama: string; kekuatan: string; jatuhTempo: ObatJatuhTempo[] }): string {
  return `Tunggu dulu. Ini ${obat(p.nama, p.kekuatan)}. Obat untuk sekarang adalah ${p.jatuhTempo.map((o) => obat(o.nama, o.kekuatan)).join(" dan ")}.`; // DRAFT
}

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

/** Nama aplikasi di UI (keputusan D7, diperbarui 14 Nov 2026: MOSA). */
export const NAMA_APLIKASI = "MOSA";

/** Dasbor Figma 04/05. Teks baru menunggu tinjauan PM. */
export const DASBOR = {
  sapaan: "Jadwal minum obat", // DRAFT
  tanggalHariIni: "Tanggal hari ini", // DRAFT
  kalender: "Hari di sekitar hari ini", // DRAFT
  kosongJudul: "Belum ada obat terdaftar", // DRAFT
  kosongPesan: "Minta apoteker atau keluarga untuk menambahkan obat pertama.", // DRAFT
  tambahPertama: "Tambah Obat Pertama", // DRAFT
  tip: "Tip: saat menebus obat di apotek, minta apoteker membantu mengisi data obat di HP ini.", // DRAFT
  beberapaDosis: "Ada beberapa dosis yang waktunya diminum", // DRAFT
  waktunyaMinum: "Waktunya minum", // DRAFT
  jadwal: "Jadwal", // DRAFT
  wib: "WIB", // DRAFT
  jadwalBerikutnya: "Jadwal berikutnya", // DRAFT
  tidakAdaJadwalBerikutnya: "Belum ada jadwal berikutnya", // DRAFT
  tidakAdaSlotHariIni: "Tidak ada dosis terjadwal untuk hari ini.", // DRAFT
  progresHariIni: "Progres Hari Ini", // DRAFT
  tanpaScan: "Tanpa scan", // DRAFT
  melaluiScan: "Melalui scan", // DRAFT
  memuat: "Memuat jadwal obat…", // DRAFT
  galatJudul: "Jadwal belum bisa ditampilkan", // DRAFT
  galatPesan: "Periksa koneksi internet, lalu coba lagi.", // DRAFT
} as const;

/** DRAFT: penghitung dikirim backend; frontend hanya menyusun kalimat. */
export function progresDosis(confirmed: number, total: number): string {
  return `Sudah ${confirmed} dari ${total} dosis`;
}

/** DRAFT: data jadwal berikutnya dari backend, tanpa perhitungan jendela di klien. */
export function waktuJadwalDasbor(next: JadwalBerikutnya): string {
  return `${FRASA_WAKTU[next.tanggal][next.kelompok]} pukul ${formatJam(next.jam)} WIB.`;
}

export function tanggalDasbor(serverTime: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" }).format(new Date(serverTime));
}

export function waktuDasbor(serverTime: string): string {
  return `${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(serverTime))} WIB`;
}

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
  /** Label aksesibel navigasi samping desktop; nama beda dari navigasi bawah (hanya satu tampil). */ // DRAFT
  navigasiSamping: "Menu aplikasi", // DRAFT
  /** Tautan lewati menu untuk pengguna keyboard (WCAG 2.4.1). */ // DRAFT
  lewatiKeIsi: "Langsung ke isi halaman", // DRAFT
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
  /** Penanda akun demo di aplikasi (P08 tugas 2; tidak ada di Figma). */
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

/** Kartu dosis Figma 05, A7, A8, B11. Teks baru menunggu tinjauan PM. */
export const DOSIS = {
  jadwalHariIni: "Jadwal hari ini", // DRAFT
  belumJatuhTempo: "Belum · Waktunya minum", // DRAFT
  belumWaktunya: "Belum waktunya", // DRAFT
  terlewatKeterangan: "Dosis ini tidak dapat dikonfirmasi lagi.", // DRAFT
  jadwalSebelumnya: "Jadwal dari hari sebelumnya", // DRAFT
  jadwalDini: "Jadwal besok", // DRAFT
  lintasTanggal: "Tetap tercatat pada tanggal jadwal asal.", // DRAFT
  diniKeterangan: "Jadwal besok ditampilkan terpisah dari progres hari ini.", // DRAFT
} as const;

export const CATAT_DOSIS = {
  tanpaScan: "Sudah minum tanpa scan", // PRD §9.5
  scanDosis: "Scan Obat untuk dosis ini", // DRAFT
  judul: "Catat tanpa foto kemasan?", // DRAFT
  keterangan: "Dicatat sebagai Sudah ✓ tanpa scan, setelah Anda menyetujui konfirmasi.", // DRAFT
  mencatat: "Sedang mencatat…", // DRAFT
  memeriksa: "Memeriksa jadwal terbaru…", // DRAFT
  periksaJadwal: "Periksa jadwal", // DRAFT
  belumPasti: "Pencatatan belum dapat dipastikan. Periksa jadwal sebelum mencoba lagi.", // DRAFT
  jadwalBerubah: "Jadwal atau status dosis sudah berubah. Tutup pop-up dan periksa jadwal terbaru.", // DRAFT
  gagalMuat: "Jadwal terbaru belum dapat dimuat. Periksa koneksi internet, lalu coba lagi.", // DRAFT
  sudahTercatat: "Dosis ini sudah tercatat. Jadwal dimuat ulang.", // DRAFT
  berhasil: "Dicatat tanpa foto kemasan", // DRAFT
  pilihJadwal: "Pilih jadwal dosis", // DRAFT
  pilihKeterangan: "Ada beberapa dosis yang masih dapat dikonfirmasi. Pilih jadwal yang Anda maksud untuk scan.", // DRAFT
  tidakAdaPilihan: "Tidak ada dosis yang dapat dipilih untuk konfirmasi saat ini.", // DRAFT
} as const;

/** DRAFT: hanya ditampilkan setelah respons konfirmasi sah dari server. */
export function catatanDosisBerhasil(p: { nama: string; kekuatan: string; date: string; jam: string }): string {
  return `${obat(p.nama, p.kekuatan)} untuk jadwal ${tanggalDosis(p.date)} pukul ${formatJam(p.jam)} WIB sudah tercatat tanpa scan.`;
}

/** Nama kelompok dipilih dari period backend, tanpa menghitung ulang batas jam. */
export function namaKelompokDosis(period: KelompokWaktu): string {
  return NAMA_KELOMPOK[period];
}

export function tanggalDosis(date: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00+07:00`));
}

/** DRAFT: identitas jadwal pada capture, tanpa menghitung status/jendela dosis. */
export function jadwalTargetScan(date: string, time: string): string {
  return `${tanggalDosis(date)} · ${formatJam(time)} WIB`;
}

/** DRAFT: tanggal konfirmasi tetap jelas bila melintasi tengah malam. */
export function waktuPencatatanDosis(confirmedAt: string): string {
  const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date(confirmedAt));
  return `Dicatat pada ${date} pukul ${waktuDasbor(confirmedAt)}.`;
}

/** DRAFT: nama aksesibel kartu membedakan obat/jam/tanggal pada slot bertumpuk. */
export function labelKartuDosis(p: { nama: string; kekuatan: string; date: string; jam: string }): string {
  return `${obat(p.nama, p.kekuatan)}, ${tanggalDosis(p.date)}, pukul ${formatJam(p.jam)} WIB`;
}

/** D-a Scan obat yang dosisnya sudah tercatat. */ // DRAFT
export function dosisSudahTercatat(p: { nama: string; jam: string; jamBerikutnya: string | null }): string {
  const awal = `Dosis ${p.nama.trim()} pukul ${formatJam(p.jam)} sudah tercatat diminum.`; // DRAFT
  return p.jamBerikutnya === null
    ? `${awal} ${DRAFT.tidakAdaDosisBerikutnya}`
    : `${awal} Dosis berikutnya pukul ${formatJam(p.jamBerikutnya)}.`; // DRAFT
}
