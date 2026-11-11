/**
 * Pagar keluaran AI (docs/04 aturan prompt, P04 #7). AI hanya boleh
 * menyederhanakan kalimat sumber; kode yang memutuskan apakah hasilnya layak
 * ditampilkan di pop-up. Bila ragu, hasil ditolak dan pengisi memakai teks
 * pengisi (D3), bukan teks AI yang belum tentu benar.
 */

// Angka dalam kata yang boleh berpadanan dengan angka pada keluaran.
const NUMBER_WORDS: Readonly<Record<string, string>> = {
  satu: "1",
  dua: "2",
  tiga: "3",
  empat: "4",
  lima: "5",
  enam: "6",
  tujuh: "7",
  delapan: "8",
  sembilan: "9",
  sepuluh: "10",
  sebelas: "11",
};

/**
 * Istilah yang menandakan diagnosis, kegunaan, atau anjuran baru. Boleh muncul
 * hanya bila sudah ada di teks sumber. Dicocokkan sebagai potongan kata,
 * sehingga "disembuhkan" tertangkap oleh "sembuh". USULAN: daftar ditinjau tim.
 */
const NEW_ADVICE_TERMS = [
  "diagnos",
  "penyakit",
  "sembuh",
  "nyembuh", // "menyembuhkan": awalan meN- meluluhkan huruf s
  "gejala",
  "dosis",
  "dokter",
  "apoteker",
  "konsultasi",
  "efek samping",
  "alergi",
  "hipertensi",
  "darah tinggi",
  "diabetes",
  "gula darah",
  "kolesterol",
  "infeksi",
  "jantung",
  "ginjal",
  "hamil",
  "menyusui",
] as const;

// Tautan atau markup tidak pernah dibutuhkan dalam penjelasan untuk lansia.
const LINK_OR_MARKUP = /https?:|www\.|[<>]/i;

function numbersIn(text: string): Set<string> {
  // "07.00" menjadi "7" dan "0": jam yang ditulis ulang "7" tetap cocok.
  return new Set([...text.matchAll(/\d+/g)].map((m) => String(Number(m[0]))));
}

function allowedNumbers(source: string): Set<string> {
  const allowed = numbersIn(source);
  for (const word of source.match(/\p{L}+/gu) ?? []) {
    const digit = NUMBER_WORDS[word];
    if (digit) allowed.add(digit);
  }
  return allowed;
}

/** true bila penjelasan tidak menambah angka, istilah medis, atau tautan yang tidak ada di sumber. */
export function isFaithfulExplanation(source: string, explanation: string): boolean {
  const from = source.toLowerCase();
  const out = explanation.toLowerCase();

  if (LINK_OR_MARKUP.test(out)) return false;

  const allowed = allowedNumbers(from);
  for (const n of numbersIn(out)) {
    if (!allowed.has(n)) return false;
  }

  return NEW_ADVICE_TERMS.every((term) => !out.includes(term) || from.includes(term));
}
