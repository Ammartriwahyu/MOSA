import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  AI_GAGAL,
  DRAFT,
  KALIMAT_PITCHING,
  KONFIRMASI_MINUM,
  KONFIRMASI_SIMPAN_OBAT,
  LABEL,
  LABEL_STATUS,
  NAMA_BELUM_TERLIHAT,
  OBAT_BELUM_TERDAFTAR,
  PERSETUJUAN_SCAN,
  TOMBOL,
  bannerJatuhTempo,
  dosisSudahTercatat,
  formatJam,
  formatKekuatan,
  jadwalBerikutnya,
  kekuatanBeda,
  konfirmasiTanpaScan,
  tungguDulu,
  verifikasiBenar,
} from "./copy";

// Sumber kebenaran: docs/02. Setiap kalimat baku tetap harus muncul persis di dokumen.
const docs02 = readFileSync(
  join(import.meta.dirname, "../../../../docs/02-copywriting-baku.md"),
  "utf8",
);
const adaDiDocs02 = (teks: string) => docs02.includes(teks);

describe("kalimat baku tetap: nilai persis", () => {
  test.each([
    ["#1", KONFIRMASI_SIMPAN_OBAT, "Periksa sekali lagi, ya. Pastikan nama obat, dosis, dan jadwal di bawah ini sudah sesuai resep. Informasi ini akan menjadi panduan minum obat setiap hari."],
    ["#2", PERSETUJUAN_SCAN, "Foto obat akan dikirim ke layanan AI untuk dibaca. Foto tidak kami simpan. Hindari memotret bagian yang berisi nama atau data pribadi."],
    ["#5", KONFIRMASI_MINUM, "Apakah obat ini sudah diminum?"],
    ["#8", OBAT_BELUM_TERDAFTAR, "Obat ini belum ada di daftar Anda. Minta apoteker atau keluarga untuk mendaftarkannya."],
    ["#9", NAMA_BELUM_TERLIHAT, "Nama obatnya belum terlihat. Coba foto bungkus atau plastik obatnya, bagian yang ada tulisan namanya."],
    ["#12", AI_GAGAL, "Maaf, pembaca foto obat sedang istirahat sebentar. Silakan coba foto lagi nanti, atau lihat jadwal dan catat minum obat langsung dari halaman utama."],
    ["B6", KALIMAT_PITCHING, "Untuk prototipe lomba, kami memakai layanan AI tier gratis dengan data uji tanpa identitas pengguna: foto tidak disimpan dan pengguna diberi tahu sebelum memakai fitur scan. Pada versi produksi, kami beralih ke layanan AI berbayar yang tidak memakai data pengguna untuk melatih model, dengan biaya yang ditutup melalui partnership dan iklan."],
  ])("%s", (_no, actual, expected) => {
    expect(actual).toBe(expected);
    expect(adaDiDocs02(actual)).toBe(true);
  });

  test("tombol dan label baku", () => {
    expect(TOMBOL).toEqual({
      yaSudahBenar: "Ya, sudah benar",
      perbaikiLagi: "Perbaiki lagi",
      sudahSayaMinum: "Sudah saya minum",
      nantiDulu: "Nanti dulu",
      batal: "Batal",
      scanObat: "Scan Obat",
      bacakan: "Bacakan",
    });
    expect(LABEL).toEqual({
      diisiApoteker: "Diisi apoteker",
      diisiKeluarga: "Diisi keluarga",
      kegunaanObat: "Kegunaan Obat",
      terlewat: "Terlewat",
    });
    for (const teks of [...Object.values(TOMBOL), ...Object.values(LABEL)]) {
      expect(adaDiDocs02(`\`${teks}\``)).toBe(true);
    }
  });
});

describe("templat baku: contoh docs/02 dihasilkan persis", () => {
  test("#3 jadwal berikutnya", () => {
    const teks = jadwalBerikutnya({ tanggal: "hari_ini", kelompok: "malam", jam: "19:00" });
    expect(teks).toBe("Obat ini perlu diminum lagi malam ini pukul 19.00.");
    expect(adaDiDocs02(teks)).toBe(true);
  });

  test.each([
    ["hari_ini", "pagi", "Obat ini perlu diminum lagi pagi ini pukul 07.00."],
    ["hari_ini", "siang", "Obat ini perlu diminum lagi siang ini pukul 07.00."],
    ["hari_ini", "malam", "Obat ini perlu diminum lagi malam ini pukul 07.00."],
    ["besok", "pagi", "Obat ini perlu diminum lagi besok pagi pukul 07.00."],
    ["besok", "siang", "Obat ini perlu diminum lagi besok siang pukul 07.00."],
    ["besok", "malam", "Obat ini perlu diminum lagi besok malam pukul 07.00."],
  ] as const)("#3 semua kombinasi: %s + %s", (tanggal, kelompok, expected) => {
    expect(jadwalBerikutnya({ tanggal, kelompok, jam: "07:00" })).toBe(expected);
  });

  test("#3 tanpa jadwal berikutnya memakai kalimat DRAFT", () => {
    expect(jadwalBerikutnya(null)).toBe("Tidak ada jadwal minum berikutnya untuk obat ini.");
  });

  test("#4 verifikasi benar", () => {
    const teks = verifikasiBenar({
      nama: "Amlodipin",
      kekuatan: "5 mg",
      jam: "07:00",
      jumlah: "1 tablet",
      aturan: "sesudah makan",
    });
    expect(teks).toBe("Obat sudah sesuai. Ini Amlodipin 5 mg untuk jadwal pukul 07.00. Minum 1 tablet sesudah makan.");
    expect(adaDiDocs02(teks)).toBe(true);
  });

  test("#4 aturan pakai berhuruf besar/bertitik tetap menjadi satu kalimat rapi", () => {
    const teks = verifikasiBenar({
      nama: "Amlodipin",
      kekuatan: "5mg",
      jam: "07:00",
      jumlah: "1 tablet",
      aturan: "Sesudah makan.",
    });
    expect(teks).toBe("Obat sudah sesuai. Ini Amlodipin 5 mg untuk jadwal pukul 07.00. Minum 1 tablet sesudah makan.");
  });

  test("#6 tunggu dulu (satu obat jatuh tempo)", () => {
    const teks = tungguDulu({
      nama: "Metformin",
      kekuatan: "500 mg",
      jam: "19:00",
      jatuhTempo: [{ nama: "Amlodipin", kekuatan: "5 mg" }],
    });
    expect(teks).toBe("Tunggu dulu. Ini Metformin 500 mg untuk jadwal pukul 19.00. Obat untuk sekarang adalah Amlodipin 5 mg.");
    expect(adaDiDocs02(teks)).toBe(true);
  });

  test("#6 lebih dari satu obat jatuh tempo dipisah \" dan \"", () => {
    const teks = tungguDulu({
      nama: "Metformin",
      kekuatan: "500 mg",
      jam: "19:00",
      jatuhTempo: [
        { nama: "Amlodipin", kekuatan: "5 mg" },
        { nama: "Simvastatin", kekuatan: "20 mg" },
      ],
    });
    expect(teks).toBe("Tunggu dulu. Ini Metformin 500 mg untuk jadwal pukul 19.00. Obat untuk sekarang adalah Amlodipin 5 mg dan Simvastatin 20 mg.");
  });

  test("#7 kekuatan beda", () => {
    const teks = kekuatanBeda({ nama: "Amlodipin", kekuatanTerbaca: "10 mg", kekuatanTerdaftar: "5 mg" });
    expect(teks).toBe("Hati-hati. Obat ini Amlodipin 10 mg, sedangkan yang terdaftar Amlodipin 5 mg. Tanyakan ke apoteker sebelum diminum.");
    expect(adaDiDocs02(teks)).toBe(true);
  });

  test("#10 konfirmasi tanpa scan", () => {
    expect(konfirmasiTanpaScan({ nama: "Amlodipin", kekuatan: "5 mg" })).toBe(
      "Anda mencatat obat ini tanpa foto kemasan. Apakah obat Amlodipin 5 mg benar sudah diminum?",
    );
    expect(adaDiDocs02("Anda mencatat obat ini tanpa foto kemasan. Apakah obat [Nama Obat] [Kekuatan] benar sudah diminum?")).toBe(true);
  });

  test("B1 banner jatuh tempo", () => {
    const teks = bannerJatuhTempo("Amlodipin");
    expect(teks).toBe("Sekarang waktunya minum Amlodipin.");
    expect(adaDiDocs02(teks)).toBe(true);
  });
});

describe("format", () => {
  test.each([
    ["07:00", "07.00"],
    ["19:30", "19.30"],
  ])("jam %s → %s", (input, expected) => {
    expect(formatJam(input)).toBe(expected);
  });

  test.each([
    ["5mg", "5 mg"],
    ["5 mg", "5 mg"],
    ["0,5mg", "0,5 mg"],
    ["500  mg", "500 mg"],
    [" 10 mcg ", "10 mcg"],
    ["1 tablet 5 mg", "1 tablet 5 mg"],
  ])("kekuatan %j → %j", (input, expected) => {
    expect(formatKekuatan(input)).toBe(expected);
  });
});

describe("DRAFT", () => {
  test("D-a dosis sudah tercatat, dengan dan tanpa dosis berikutnya", () => {
    expect(dosisSudahTercatat({ nama: "Amlodipin", jam: "07:00", jamBerikutnya: "19:00" })).toBe(
      "Dosis Amlodipin pukul 07.00 sudah tercatat diminum. Dosis berikutnya pukul 19.00.",
    );
    expect(dosisSudahTercatat({ nama: "Amlodipin", jam: "19:00", jamBerikutnya: null })).toBe(
      "Dosis Amlodipin pukul 19.00 sudah tercatat diminum. Tidak ada dosis berikutnya hari ini.",
    );
  });

  test("kalimat DRAFT dari docs/02 disalin persis (belum disetujui, tetapi tidak diubah)", () => {
    for (const teks of [
      DRAFT.kekuatanBelumTerlihat,
      DRAFT.penjelasanBelumTersedia,
      DRAFT.suaraTidakTersedia,
      DRAFT.persetujuanData,
      DRAFT.tidakAdaJadwalBerikutnya,
      DRAFT.tidakAdaDosisBerikutnya,
    ]) {
      expect(adaDiDocs02(teks)).toBe(true);
    }
  });

  test("label status: Terlewat baku, sisanya DRAFT dari docs/06", () => {
    expect(LABEL_STATUS).toEqual({
      belum: "Belum",
      sudahScan: "Sudah, terverifikasi scan",
      sudahTanpaScan: "Sudah, tanpa scan",
      terlewat: "Terlewat",
    });
  });
});

describe("kebersihan teks", () => {
  const semua = [
    KONFIRMASI_SIMPAN_OBAT,
    PERSETUJUAN_SCAN,
    KONFIRMASI_MINUM,
    OBAT_BELUM_TERDAFTAR,
    NAMA_BELUM_TERLIHAT,
    AI_GAGAL,
    ...Object.values(DRAFT),
    verifikasiBenar({ nama: " Amlodipin ", kekuatan: "5mg", jam: "07:00", jumlah: "1 tablet ", aturan: " sesudah makan. " }),
    tungguDulu({ nama: "A", kekuatan: "1 mg", jam: "07:00", jatuhTempo: [{ nama: "B", kekuatan: "2mg" }] }),
  ];

  test.each(semua)("tanpa spasi ganda, titik ganda, atau spasi di tepi: %j", (teks) => {
    expect(teks).not.toMatch(/ {2}|\.\.(?!\.)|\s$|^\s/);
  });
});
