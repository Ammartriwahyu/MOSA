
export const PUSH = {
  heading: "Pengingat di HP ini",
  explanation: "Izinkan notifikasi agar HP ini dapat menerima pengingat. Pengingat bisa terlambat atau tidak muncul. Tetap periksa jadwal di aplikasi.",
  enable: "Aktifkan pengingat",
  disable: "Matikan pengingat",
  enabled: "Pengingat aktif di HP ini.",
  disabled: "Pengingat tidak aktif di HP ini.",
  preparing: "Menyiapkan pengingat…",
  busy: "Menyimpan pilihan pengingat…",
  denied: "Izin notifikasi ditolak. Jika ingin mengaktifkannya, ubah izin situs ini melalui pengaturan browser atau HP, lalu coba lagi.",
  unsupported: "Browser ini belum mendukung pengingat. Anda tetap dapat melihat jadwal di aplikasi.",
  unavailable: "Pengingat belum tersedia. Anda tetap dapat melihat jadwal di aplikasi.",
  failed: "Pilihan pengingat belum tersimpan. Periksa koneksi, lalu coba lagi.",
  cancelled: "Pilihan pengingat berubah. Periksa kembali pengaturan di HP ini.",
  retry: "Periksa lagi",
  installHeading: "Pasang di layar utama",
  install: "Pasang aplikasi",
  installed: "Aplikasi sudah dibuka dari layar utama.",
  installHint: "Gunakan pilihan Pasang aplikasi atau Tambahkan ke layar utama pada menu browser. Aplikasi tetap memerlukan internet.",
  iosHint: "Di iPhone atau iPad, buka aplikasi ini di Safari, pilih Bagikan, lalu Tambahkan ke Layar Utama. Buka dari layar utama untuk mengaktifkan pengingat.",
  notificationTitle: "Pengingat MOSA",
  notificationBody: "Buka aplikasi untuk memeriksa jadwal Anda.",
} as const;

export function formatJam(jam: string): string {
  return jam.replace(":", ".");
}

export function formatKekuatan(kekuatan: string): string {
  const trimmed = kekuatan.trim();
  const match = /^(\d+(?:[.,]\d+)?)\s*([^\d\s].*)$/.exec(trimmed);
  return match ? `${match[1]} ${match[2]}` : trimmed;
}

function aturanDalamKalimat(aturan: string): string {
  const trimmed = aturan.trim().replace(/[.\s]+$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

const obat = (nama: string, kekuatan: string) => `${nama.trim()} ${formatKekuatan(kekuatan)}`;

export type KelompokWaktu = "pagi" | "siang" | "malam";

export type JadwalBerikutnya = {
  tanggal: "hari_ini" | "besok";
  kelompok: KelompokWaktu;

  jam: string;
};

export type ObatJatuhTempo = { nama: string; kekuatan: string };

export const TOMBOL = {
  yaSudahBenar: "Ya, sudah benar",
  perbaikiLagi: "Perbaiki lagi",
  sudahSayaMinum: "Sudah saya minum",
  nantiDulu: "Nanti dulu",

  batal: "Batal",

  scanObat: "Scan Obat",

  bacakan: "Bacakan",
} as const;

export const SUARA = {
  stop: "Berhenti",
  checking: "Memeriksa suara bahasa Indonesia…",
  starting: "Menyiapkan suara…",
  speaking: "Sedang membacakan teks.",
  blocked: "Suara belum dapat diputar. Ketuk Bacakan untuk mencoba lagi. Teks tetap bisa dibaca di layar.",
  failed: "Suara belum dapat diputar. Coba lagi atau baca teks di layar.",
  readable: "Informasi tetap bisa dibaca",
} as const;

export const LABEL = {

  diisiApoteker: "Diisi apoteker",
  diisiKeluarga: "Diisi keluarga",

  kegunaanObat: "Kegunaan Obat",

  terlewat: "Terlewat",
} as const;

export const KONFIRMASI_SIMPAN_OBAT =
  "Periksa sekali lagi, ya. Pastikan nama obat, dosis, dan jadwal di bawah ini sudah sesuai resep. Informasi ini akan menjadi panduan minum obat setiap hari.";

export const PERSETUJUAN_SCAN =
  "Foto obat akan dikirim ke layanan AI untuk dibaca. Foto tidak kami simpan. Hindari memotret bagian yang berisi nama atau data pribadi.";

export const SCAN_CAPTURE = {
  consentTitle: "Sebelum memotret obat",
  agree: "Saya mengerti, lanjut",
  goodPackage: "Foto bungkus, strip, atau plastik obat",
  avoidLabel: "Jangan foto etiket yang berisi nama pasien",
  deviceNote: "Persetujuan diminta pada setiap HP yang digunakan.",
  savingConsent: "Menyimpan persetujuan…",
  consentFailed: "Persetujuan belum dapat disimpan. Periksa koneksi, lalu coba lagi.",
  loadFailed: "Persetujuan scan belum dapat diperiksa.",
  checkingConsent: "Memeriksa persetujuan scan…",
  backToSchedule: "Kembali ke Jadwal",
  retry: "Coba lagi",
  camera: "Ambil foto dengan kamera",
  cameraHint: "Ketuk untuk memotret",
  upload: "Unggah Foto",
  retake: "Foto ulang",
  another: "Pilih foto lain",
  close: "Tutup scan dan kembali ke jadwal",
  genericMode: "Scan kemasan obat",
  selectedMode: "Untuk jadwal yang Anda pilih",
  instruction: "Pastikan nama dan kekuatan obat pada kemasan terlihat jelas.",
  empty: "Foto kemasan akan tampil di sini.",
  processing: "Menyiapkan foto…",
  ready: "Foto siap diperiksa",
  review: "Periksa nama dan kekuatan pada foto. Hindari bagian yang berisi data pribadi.",
  preview: "Pratinjau foto kemasan pilihan Anda",
  unsupported: "Pilih foto JPEG, PNG, atau WebP. Jika foto tidak bisa dibuka, ambil ulang dengan kamera.",
  tooLarge: "Foto ini terlalu besar untuk diproses. Ambil ulang dengan resolusi lebih kecil.",
  unreadable: "Foto belum bisa dibuka. Ambil ulang atau pilih foto lain.",
  compressionFailed: "Foto belum berhasil disiapkan. Ambil ulang atau pilih foto lain.",
  invalidTarget: "Jadwal pada tautan ini tidak valid. Kembali ke jadwal dan pilih dosis lagi.",
} as const;

export const SCAN_REQUEST = {
  usePhoto: "Gunakan Foto Ini",
  reading: "Sedang membaca kemasan obat…",
  waiting: "Mohon tunggu sebentar. Foto tidak kami simpan.",
  cancelHint: "Batal menghentikan penantian di HP ini. Foto yang sudah terkirim mungkin tetap diproses dan jatah scan dapat terpakai.",
  cancelled: "Pemindaian dibatalkan di HP ini. Tidak ada dosis yang dicatat.",
  failedTitle: "Foto belum dapat diperiksa",
  consent: "Persetujuan scan perlu diperiksa lagi sebelum mengirim foto.",
  session: "Sesi Anda sudah berakhir. Silakan masuk lagi.",
  target: "Jadwal yang dipilih sudah tidak tersedia. Kembali ke jadwal dan pilih dosis lagi.",
  invalid: "Pemindaian belum dapat diproses. Pilih foto lain atau periksa data obat dan jadwal Anda.",
  again: "Foto lagi",
} as const;

export const SCAN_OUTCOME = {
  title: "Hasil Scan",
  infoTitle: "Informasi Obat",
  matched: "Obat sudah sesuai",
  unreadable: "Foto belum bisa dibaca",
  unregistered: "Obat belum terdaftar",
  missingStrength: "Kekuatan obat belum terbaca",
  differentStrength: "Hati-hati, kekuatan obat berbeda",
  wait: "Tunggu dulu",
  recorded: "Dosis sudah tercatat",
  matching: "Hasil pencocokan",
  name: "Nama obat",
  strength: "Kekuatan",
  schedule: "Jadwal dosis",
  photographed: "Kekuatan yang terbaca",
  registered: "Yang terdaftar",
  currentMedicines: "Obat untuk sekarang",
  chooseSlot: "Pilih jadwal dosis",
  chooseSlotHint: "Ada beberapa jadwal untuk obat ini. Pilih satu jadwal dosis yang Anda maksud.",
  noNewDose: "Tidak ada dosis yang dicatat dari pemeriksaan foto ini.",
  noConfirmation: "Tidak perlu dikonfirmasi lagi",
  viewInfo: "Lihat Informasi Obat",
  backToResult: "Kembali ke Hasil Scan",
  retryPhoto: "Foto Ulang Kemasan",
  correctPhoto: "Foto Obat yang Benar",
  goodPhoto: "Foto strip, bungkus, atau plastik yang ada tulisan nama obat",
  avoidLoosePills: "Foto butir tablet atau kapsul saja",
} as const;

export const SCAN_CONFIRM = {
  continue: "Lanjut: Catat Minum Obat",
  saving: "Mencatat minum obat…",
  hint: "Konfirmasi yang berhasil dicatat sebagai Sudah ✓✓ melalui scan. Nanti dulu tidak menyimpan konfirmasi; scan ulang saat siap.",
  expired: "Hasil scan ini sudah tidak berlaku. Foto ulang kemasan untuk memeriksa jadwal terbaru.",
  changed: "Jadwal atau data obat sudah berubah. Kembali ke jadwal untuk memeriksa dosis ini.",
  uncertain: "Hasil pencatatan belum dapat dipastikan. Periksa jadwal sebelum mencoba lagi.",
  already: "Dosis ini sudah tercatat. Periksa jadwal untuk melihat metode pencatatannya.",
  saved: "Minum obat berhasil dicatat",
  rescan: "Scan ulang",
} as const;

export function tungguDuluTanpaJadwal(p: { nama: string; kekuatan: string; jatuhTempo: ObatJatuhTempo[] }): string {
  return `Tunggu dulu. Ini ${obat(p.nama, p.kekuatan)}. Obat untuk sekarang adalah ${p.jatuhTempo.map((o) => obat(o.nama, o.kekuatan)).join(" dan ")}.`;
}

const FRASA_WAKTU: Record<JadwalBerikutnya["tanggal"], Record<KelompokWaktu, string>> = {
  hari_ini: { pagi: "pagi ini", siang: "siang ini", malam: "malam ini" },
  besok: { pagi: "besok pagi", siang: "besok siang", malam: "besok malam" },
};

export function jadwalBerikutnya(next: JadwalBerikutnya | null): string {
  if (next === null) return DRAFT.tidakAdaJadwalBerikutnya;
  return `Obat ini perlu diminum lagi ${FRASA_WAKTU[next.tanggal][next.kelompok]} pukul ${formatJam(next.jam)}.`;
}

export function verifikasiBenar(p: {
  nama: string;
  kekuatan: string;
  jam: string;
  jumlah: string;
  aturan: string;
}): string {
  return `Obat sudah sesuai. Ini ${obat(p.nama, p.kekuatan)} untuk jadwal pukul ${formatJam(p.jam)}. Minum ${p.jumlah.trim()} ${aturanDalamKalimat(p.aturan)}.`;
}

export const KONFIRMASI_MINUM = "Apakah obat ini sudah diminum?";

export function tungguDulu(p: {
  nama: string;
  kekuatan: string;
  jam: string;
  jatuhTempo: ObatJatuhTempo[];
}): string {
  const sekarang = p.jatuhTempo.map((o) => obat(o.nama, o.kekuatan)).join(" dan ");
  return `Tunggu dulu. Ini ${obat(p.nama, p.kekuatan)} untuk jadwal pukul ${formatJam(p.jam)}. Obat untuk sekarang adalah ${sekarang}.`;
}

export function kekuatanBeda(p: {
  nama: string;
  kekuatanTerbaca: string;
  kekuatanTerdaftar: string;
}): string {
  return `Hati-hati. Obat ini ${obat(p.nama, p.kekuatanTerbaca)}, sedangkan yang terdaftar ${obat(p.nama, p.kekuatanTerdaftar)}. Tanyakan ke apoteker sebelum diminum.`;
}

export const OBAT_BELUM_TERDAFTAR =
  "Obat ini belum ada di daftar Anda. Minta apoteker atau keluarga untuk mendaftarkannya.";

export const NAMA_BELUM_TERLIHAT =
  "Nama obatnya belum terlihat. Coba foto bungkus atau plastik obatnya, bagian yang ada tulisan namanya.";

export function konfirmasiTanpaScan(p: { nama: string; kekuatan: string }): string {
  return `Anda mencatat obat ini tanpa foto kemasan. Apakah obat ${obat(p.nama, p.kekuatan)} benar sudah diminum?`;
}

export const AI_GAGAL =
  "Maaf, pembaca foto obat sedang istirahat sebentar. Silakan coba foto lagi nanti, atau lihat jadwal dan catat minum obat langsung dari halaman utama.";

export function bannerJatuhTempo(nama: string): string {
  return `Sekarang waktunya minum ${nama.trim()}.`;
}

export const KALIMAT_PITCHING =
  "Untuk prototipe lomba, kami memakai layanan AI tier gratis dengan data uji tanpa identitas pengguna: foto tidak disimpan dan pengguna diberi tahu sebelum memakai fitur scan. Pada versi produksi, kami beralih ke layanan AI berbayar yang tidak memakai data pengguna untuk melatih model, dengan biaya yang ditutup melalui partnership dan iklan.";

export const NAMA_APLIKASI = "MOSA";

export const DASBOR = {
  sapaan: "Jadwal minum obat",
  tanggalHariIni: "Tanggal hari ini",
  kalender: "Hari di sekitar hari ini",
  kosongJudul: "Belum ada obat terdaftar",
  kosongPesan: "Minta apoteker atau keluarga untuk menambahkan obat pertama.",
  tambahPertama: "Tambah Obat Pertama",
  tip: "Tip: saat menebus obat di apotek, minta apoteker membantu mengisi data obat di HP ini.",
  beberapaDosis: "Ada beberapa dosis yang waktunya diminum",
  waktunyaMinum: "Waktunya minum",
  jadwal: "Jadwal",
  wib: "WIB",
  jadwalBerikutnya: "Jadwal berikutnya",
  tidakAdaJadwalBerikutnya: "Belum ada jadwal berikutnya",
  tidakAdaSlotHariIni: "Tidak ada dosis terjadwal untuk hari ini.",
  progresHariIni: "Progres Hari Ini",
  tanpaScan: "Tanpa scan",
  melaluiScan: "Melalui scan",
  memuat: "Memuat jadwal obat…",
  galatJudul: "Jadwal belum bisa ditampilkan",
  galatPesan: "Periksa koneksi internet, lalu coba lagi.",
} as const;

export function progresDosis(confirmed: number, total: number): string {
  return `Sudah ${confirmed} dari ${total} dosis`;
}

export function waktuJadwalDasbor(next: JadwalBerikutnya): string {
  return `${FRASA_WAKTU[next.tanggal][next.kelompok]} pukul ${formatJam(next.jam)} WIB.`;
}

export function tanggalDasbor(serverTime: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long" }).format(new Date(serverTime));
}

export function waktuDasbor(serverTime: string): string {
  return `${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(serverTime))} WIB`;
}

export const DRAFT = {

  tidakAdaDosisBerikutnya: "Tidak ada dosis berikutnya hari ini.",

  kekuatanBelumTerlihat:
    "Kekuatan obatnya belum terlihat. Coba foto lagi, bagian yang ada tulisan kekuatannya.",

  penjelasanBelumTersedia: "Penjelasan sederhana belum tersedia.",

  suaraTidakTersedia:
    "Suara bahasa Indonesia belum tersedia di HP ini. Teks tetap bisa dibaca di layar.",

  persetujuanData: "Saya setuju data obat saya disimpan di aplikasi ini.",

  tidakAdaJadwalBerikutnya: "Tidak ada jadwal minum berikutnya untuk obat ini.",

  hapusAkunJudul: "Hapus seluruh data dan akun?",
  hapusAkunPenjelasan:
    "Semua data obat, jadwal, dan riwayat minum akan dihapus permanen dari semua HP yang memakai akun ini.",

  sedangMembacaFoto: "Sedang membaca foto…",

  petunjukAturanPakai: "Tulis hubungan dengan makan saja, tanpa jam. Contoh: sesudah makan.",

  tidakAdaLarangan: "Tidak ada larangan khusus",

  tutup: "Tutup",

  memuat: "Memuat…",

  navJadwal: "Jadwal",
  navObat: "Obat",

  navigasiUtama: "Navigasi utama",

  navigasiSamping: "Menu aplikasi",

  lewatiKeIsi: "Langsung ke isi halaman",

  kembali: "Kembali",
  pengaturan: "Pengaturan",

  deskripsiAplikasi: "MOSA: Medication Organizer, Scanner & Assistant",

  // DRAFT: pratinjau kamera langsung di halaman scan
  kameraMenyala: "Menyalakan kamera…",
  kameraDitolak: "Izin kamera belum diberikan. Izinkan kamera di pengaturan browser, atau unggah foto.",
} as const;

export const PREFERENSI = {
  judulLayar: "Pilihan Tampilan",
  pertanyaan: "Pilih cara menerima informasi obat",
  teksSaja: "Teks saja",
  teksSajaKeterangan: "Informasi mudah dibaca di layar.",
  teksSuara: "Teks + Suara Otomatis",
  teksSuaraKeterangan: "Dibacakan setelah sentuhan layar.",
  catatanUbah: "Pilihan ini dapat diubah dari Informasi Obat.",
  simpanLihatHasil: "Simpan & Lihat Hasil",
  simpanPilihan: "Simpan Pilihan",
} as const;

export const PENGATURAN = {
  judul: "Pengaturan",
  caraMenampilkan: "Cara menampilkan informasi",
  teksSajaKeterangan: "Huruf besar di layar",
  teksSuaraKeterangan: "Dibacakan setelah Anda menyentuh layar",
  tersimpan: "Pilihan tersimpan.",
  akunBersama: "Akun bersama",
  labelNama: "Nama",
  labelEmail: "Email",
  labelTetapMasuk: "Tetap masuk",
  tetapMasukAktif: "Aktif di HP ini",
  dataPrivasi: "Data dan privasi",
  privasiFoto: "Foto obat tidak disimpan",
  privasiAi: "Nama dan identitas tidak dikirim ke AI",
  hapusAkun: "Hapus Seluruh Data & Akun",
  yaHapusSemua: "Ya, hapus semua",
  demoDilindungi: "Akun demo juri dilindungi dan tidak bisa dihapus.",
  labelKataSandiUlang: "Masukkan ulang kata sandi",
  galatKataSandiHapus: "Kata sandi salah. Data tidak dihapus.",
} as const;

export const AUTH = {
  onboardingJudul: "Minum obat tepat waktu",
  onboardingIsi: "Bantu lansia dan keluarga mengikuti instruksi obat dari apoteker.",
  mulaiSekarang: "Mulai Sekarang",

  ilustrasiJadwal: "Pagi · 07.00",
  ilustrasiObat: "Amlodipin 5 mg",
  ilustrasiStatus: "Sudah",
  sudahPunyaAkun: "Sudah punya akun?",
  masuk: "Masuk",
  masukJudul: "Masuk ke akun keluarga",
  masukIsi: "Satu akun dipakai bersama oleh lansia dan keluarga, dari HP masing-masing.",
  tetapMasuk: "Anda tetap masuk di HP ini. Tidak perlu masuk berulang kali.",
  belumPunyaAkun: "Belum punya akun?",
  daftarAkunBaru: "Daftar akun baru",
  daftarJudul: "Daftar Akun",
  daftarIsi: "Buat satu akun untuk dipakai bersama oleh lansia dan keluarga.",
  labelNamaPasien: "Nama pasien",
  labelEmail: "Email",
  labelKataSandi: "Kata sandi",
  labelUlangiKataSandi: "Ulangi kata sandi",

  persetujuanKeterangan: "Data hanya bisa dilihat pemilik akun dan bisa dihapus kapan saja.",
  buatAkun: "Buat Akun",
  persetujuanJudul: "Persetujuan data",
  persetujuanIsi: "Sebelum memakai aplikasi, setujui penyimpanan data obat di akun ini.",
  setujuLanjutkan: "Setuju dan lanjutkan",
  keluar: "Keluar dari Akun",

  galatNama: "Isi nama pasien.",
  galatEmail: "Isi email yang benar, misalnya nama@email.com.",
  galatKataSandiPendek: "Kata sandi minimal 8 karakter.",
  galatKataSandiBeda: "Kata sandi tidak sama.",
  galatPersetujuan: "Centang persetujuan untuk membuat akun.",
  galatKataSandiKosong: "Isi kata sandi.",
  galatMasuk: "Email atau kata sandi salah.",
  galatEmailBelumDikonfirmasi: "Email belum dikonfirmasi. Buka email Anda, lalu masuk lagi.",
  galatSudahTerdaftar: "Email ini sudah terdaftar. Silakan masuk.",
  galatKataSandiLemah: "Kata sandi terlalu mudah ditebak. Pakai kata sandi lain.",
  galatJaringan: "Tidak dapat terhubung. Periksa internet, lalu coba lagi.",
  galatUmum: "Terjadi kesalahan. Coba lagi sebentar lagi.",
  cekEmail: "Akun dibuat. Buka email Anda untuk konfirmasi, lalu masuk.",
  cobaLagi: "Coba lagi",
} as const;

const NAMA_KELOMPOK: Record<KelompokWaktu, string> = { pagi: "Pagi", siang: "Siang", malam: "Malam" };

export function kelompokWaktu(jam: string): KelompokWaktu {
  const menit = Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3, 5));
  if (menit >= 4 * 60 && menit < 11 * 60) return "pagi";
  if (menit >= 11 * 60 && menit < 18 * 60) return "siang";
  return "malam";
}

export function formatJamMinum(jam: readonly string[]): string {
  return jam.map((j) => `${NAMA_KELOMPOK[kelompokWaktu(j)]} ${formatJam(j)}`).join(" · ");
}

export const OBAT = {
  judulDaftar: "Daftar Obat",
  tambahObat: "Tambah Obat",
  kosongJudul: "Belum ada obat",
  kosongPesan: "Tambahkan obat pertama agar jadwal minum muncul di layar Jadwal.",
  judulDetail: "Detail Obat",
  penjelasanSederhana: "Penjelasan Sederhana",
  penjelasanDiperiksa: "Dibuat AI dan sudah diperiksa saat disimpan",
  informasiAsli: "Informasi asli pengisi",
  aturanPakai: "Aturan pakai",
  jumlahPerMinum: "Jumlah per minum",
  jamMinum: "Jam minum",
  larangan: "Larangan / peringatan",
  catatanPribadi: "Catatan pribadi",
  bukanSaranMedis:
    "Informasi ini berasal dari data yang diisi apoteker atau keluarga. Aplikasi tidak memberi saran medis.",
  ubahPilihanKeluaran: "Ubah pilihan teks / suara",
  tidakDitemukan: "Obat tidak ditemukan",
  tidakDitemukanPesan: "Obat ini mungkin sudah dihapus.",
  kembaliKeDaftar: "Kembali ke Daftar Obat",
} as const;

export function labelJamMinum(jam: string): string {
  return `${NAMA_KELOMPOK[kelompokWaktu(jam)]} · ${formatJam(jam)}`;
}

export const FORM_OBAT = {
  catatanIsi: "Isi sesuai resep atau etiket obat. Pilih sumber informasi sebelum melanjutkan.",
  siapaMengisi: "Siapa yang mengisi?",
  siapaMengisiPetunjuk: "Pilih sesuai orang yang mengisi data obat.",
  dataObat: "Data obat",
  namaObat: "Nama obat",
  namaPetunjuk: "Pilih dari daftar atau tulis nama seperti yang tertera di kemasan.",
  kekuatan: "Kekuatan",
  kekuatanPetunjuk: "Salin angka dan satuan kekuatan pada kemasan.",
  jamBisaDiubah: "Jam bisa diubah sesuai resep",
  ubahJam: "Ubah jam",
  jamLain: "Jam lain",
  tambahJam: "Tambah jam lain",
  privasiPetunjuk: "Jangan tulis nama atau data pribadi pasien di sini.",
  catatanOpsional: "Catatan pribadi (opsional)",
  catatanContoh: "Contoh: simpan di kotak obat biru",
  kirimAi: "Hanya aturan pakai, peringatan, dan catatan dikirim ke AI. Jangan tulis identitas pasien.",
  lanjut: "Lanjut: Periksa Data",
  galatWajib: "Kolom ini wajib diisi.",
  galatKekuatan: "Tulis angka dan satuannya, misalnya 5 mg.",
  galatPanjang: "Tulisan terlalu panjang.",
  galatSumber: "Pilih siapa yang mengisi.",
  galatJamMinimal: "Pilih minimal satu jam minum.",
  galatJamKosong: "Isi jamnya.",
  galatJamSama: "Jam minum tidak boleh sama.",
  galatRingkas: "Ada isian yang perlu diperbaiki.",
} as const;

export const SIMPAN_OBAT = {
  menyiapkan: "Menyiapkan penjelasan sederhana…",
  prosesIsi: "AI sedang menyederhanakan instruksi obat. Hanya data obat yang dikirim, tanpa nama atau data pribadi.",
  periksaJudul: "Periksa data obat",
  dataAsli: "Data asli",
  sumber: "Sumber",
  penjelasanAi: "Penjelasan sederhana (dibuat AI)",
  tanpaAi: "Data tetap bisa disimpan tanpa penjelasan AI. Panduan minum memakai teks asli pengisi.",
  menyimpan: "Menyimpan obat…",
  galatSimpan: "Obat belum berhasil disimpan. Periksa koneksi, lalu coba lagi.",
  galatValidasi: "Data obat belum dapat disimpan. Pilih Perbaiki lagi dan periksa isian sesuai resep.",
  berhasil: "Obat berhasil disimpan",
  baru: "Baru",
} as const;

export const UBAH_OBAT = {
  judul: "Ubah data obat",
  tombol: "Ubah Data Obat",
  petunjuk: "Perubahan jadwal langsung berlaku. Riwayat minum yang sudah tercatat tetap tersimpan.",
  periksaJudul: "Periksa perubahan obat",
  berhasil: "Perubahan obat berhasil disimpan",
  hapus: "Hapus Obat",
  hapusJudul: "Hapus obat ini?",
  hapusPenjelasan: "Obat dinonaktifkan dan jadwal berikutnya dihentikan. Riwayat konsumsi tetap tersimpan. Tindakan ini tidak bisa dibatalkan.",
  yaHapus: "Ya, hapus obat",
  menghapus: "Menonaktifkan obat…",
  galatHapus: "Obat belum berhasil dinonaktifkan. Periksa koneksi, lalu coba lagi.",
  dinonaktifkan: "Obat dinonaktifkan",
  dinonaktifkanIsi: "Jadwal berikutnya dihentikan. Riwayat konsumsi tetap tersimpan.",
} as const;

export function jumlahObatTerdaftar(jumlah: number): string {
  return `${jumlah} obat terdaftar`;
}

export const LABEL_STATUS = {
  belum: "Belum",
  sudahScan: "Sudah, terverifikasi scan",
  sudahTanpaScan: "Sudah, tanpa scan",
  terlewat: LABEL.terlewat,
} as const;

export const DOSIS = {
  jadwalHariIni: "Jadwal hari ini",
  belumJatuhTempo: "Belum · Waktunya minum",
  belumWaktunya: "Belum waktunya",
  terlewatKeterangan: "Dosis ini tidak dapat dikonfirmasi lagi.",
  jadwalSebelumnya: "Jadwal dari hari sebelumnya",
  jadwalDini: "Jadwal besok",
  lintasTanggal: "Tetap tercatat pada tanggal jadwal asal.",
  diniKeterangan: "Jadwal besok ditampilkan terpisah dari progres hari ini.",
} as const;

export const CATAT_DOSIS = {
  tanpaScan: "Sudah minum tanpa scan",
  scanDosis: "Scan Obat untuk dosis ini",
  judul: "Catat tanpa foto kemasan?",
  keterangan: "Dicatat sebagai Sudah ✓ tanpa scan, setelah Anda menyetujui konfirmasi.",
  mencatat: "Sedang mencatat…",
  memeriksa: "Memeriksa jadwal terbaru…",
  periksaJadwal: "Periksa jadwal",
  belumPasti: "Pencatatan belum dapat dipastikan. Periksa jadwal sebelum mencoba lagi.",
  jadwalBerubah: "Jadwal atau status dosis sudah berubah. Tutup pop-up dan periksa jadwal terbaru.",
  gagalMuat: "Jadwal terbaru belum dapat dimuat. Periksa koneksi internet, lalu coba lagi.",
  sudahTercatat: "Dosis ini sudah tercatat. Jadwal dimuat ulang.",
  berhasil: "Dicatat tanpa foto kemasan",
  pilihJadwal: "Pilih jadwal dosis",
  pilihKeterangan: "Ada beberapa dosis yang masih dapat dikonfirmasi. Pilih jadwal yang Anda maksud untuk scan.",
  tidakAdaPilihan: "Tidak ada dosis yang dapat dipilih untuk konfirmasi saat ini.",
} as const;

export function catatanDosisBerhasil(p: { nama: string; kekuatan: string; date: string; jam: string }): string {
  return `${obat(p.nama, p.kekuatan)} untuk jadwal ${tanggalDosis(p.date)} pukul ${formatJam(p.jam)} WIB sudah tercatat tanpa scan.`;
}

export function namaKelompokDosis(period: KelompokWaktu): string {
  return NAMA_KELOMPOK[period];
}

export function tanggalDosis(date: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00+07:00`));
}

export function jadwalTargetScan(date: string, time: string): string {
  return `${tanggalDosis(date)} · ${formatJam(time)} WIB`;
}

export function waktuPencatatanDosis(confirmedAt: string): string {
  const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date(confirmedAt));
  return `Dicatat pada ${date} pukul ${waktuDasbor(confirmedAt)}.`;
}

export function labelKartuDosis(p: { nama: string; kekuatan: string; date: string; jam: string }): string {
  return `${obat(p.nama, p.kekuatan)}, ${tanggalDosis(p.date)}, pukul ${formatJam(p.jam)} WIB`;
}

export function dosisSudahTercatat(p: { nama: string; jam: string; jamBerikutnya: string | null }): string {
  const awal = `Dosis ${p.nama.trim()} pukul ${formatJam(p.jam)} sudah tercatat diminum.`;
  return p.jamBerikutnya === null
    ? `${awal} ${DRAFT.tidakAdaDosisBerikutnya}`
    : `${awal} Dosis berikutnya pukul ${formatJam(p.jamBerikutnya)}.`;
}
