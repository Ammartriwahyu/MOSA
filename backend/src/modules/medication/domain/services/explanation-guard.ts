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
  "takaran",
  "gandakan",
  "tingkatkan",
  "kurangi",
  "hentikan",
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

// Instruksi pengambilalihan bukan sumber untuk menyusun panduan minum. Teks
// asli tetap dapat disimpan lewat fallback, tanpa mengubah input pengisi.
const CONTROL_INSTRUCTION = /(?:^|[.!?\n])\s*(?:abaikan|lupakan|ignore)\b[^.!?\n]{0,100}\b(?:instruksi|aturan|perintah|previous|system|semua)\b|(?:^|\n)\s*(?:system|assistant|developer)\s*:|<\/(?:data|catatan|aturan_pakai|larangan)>/i;

function normalizedNumbers(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => NUMBER_WORDS[word] ?? word);
}

function quantities(text: string): Set<string> {
  const compact = normalizedNumbers(text).replace(/(\d)\s*\/\s*(\d)/g, "$1/$2");
  const pairs = compact.matchAll(/(?<![\d.,/])(\d+(?:[.,]\d+|\/\d+)?)\s*(tablet|kaplet|kapsul|butir|tetes|sendok|puff|semprot|miligram|mikrogram|mililiter|gram|mcg|mg|ml|g)\b/g);
  const units: Readonly<Record<string, string>> = { miligram: "mg", mikrogram: "mcg", mililiter: "ml", gram: "g" };
  return new Set([...pairs].map(([, amount = "", unit = ""]) => `${amount.includes("/") ? amount : String(Number(amount.replace(",", ".")))}:${units[unit] ?? unit}`));
}

function prohibitions(text: string): string[][] {
  return text.split(/(?<!\d)\.|\.(?!\d)|[!?;\n]+/).flatMap((clause) => {
    const match = /\b(?:jangan|tidak\s+boleh|tidak(?!\s+ada\s+larangan\b)|dilarang|hindari)\b/.exec(clause);
    if (!match) return [];
    const words = clause.slice(match.index + match[0].length).match(/[\p{L}\d]+/gu) ?? [];
    return [words.map((word) => /^(?:diminum|meminum|minumlah)$/.test(word) ? "minum" : word)];
  });
}

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

/** Pagar konservatif untuk angka, pasangan takaran, topik larangan dan kontrol prompt.
 * Bukan pembuktian kesetiaan semantik; pemeriksaan manusia tetap wajib.
 */
export function isFaithfulExplanation(source: string, explanation: string): boolean {
  const from = source.toLowerCase();
  const out = explanation.toLowerCase();

  if (CONTROL_INSTRUCTION.test(from) || LINK_OR_MARKUP.test(out)) return false;

  // Angka yang sah sebagai frekuensi/jam tidak otomatis sah sebagai takaran.
  const sourceQuantities = quantities(from);
  for (const quantity of quantities(out)) if (!sourceQuantities.has(quantity)) return false;
  const originals = prohibitions(from); const warnings = prohibitions(out);
  const sameTopics = (a: string[], b: string[]) => a.every((word) => b.includes(word)) && b.every((word) => a.includes(word));
  if (originals.some((original) => !warnings.some((warning) => sameTopics(original, warning)))
    || warnings.some((warning) => !originals.some((original) => sameTopics(original, warning)))) return false;

  const allowed = allowedNumbers(from);
  for (const n of numbersIn(out)) {
    if (!allowed.has(n)) return false;
  }

  return NEW_ADVICE_TERMS.every((term) => !out.includes(term) || from.includes(term));
}
