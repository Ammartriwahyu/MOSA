
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

const NEW_ADVICE_TERMS = [
  "diagnos",
  "penyakit",
  "sembuh",
  "nyembuh",
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

const LINK_OR_MARKUP = /https?:|www\.|[<>]/i;

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

const WARNING_FILLER_WORDS = new Set(["minum", "obat", "ini", "itu", "anda", "juga", "ya"]);

function sameTopics(original: string[], warning: string[]): boolean {
  let next = 0;
  for (const word of warning) {
    if (word === original[next]) next++;
    else if (!WARNING_FILLER_WORDS.has(word)) return false;
  }
  return next === original.length;
}

function numbersIn(text: string): Set<string> {

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

export function isFaithfulExplanation(source: string, explanation: string): boolean {
  const from = source.toLowerCase();
  const out = explanation.toLowerCase();

  if (CONTROL_INSTRUCTION.test(from) || LINK_OR_MARKUP.test(out)) return false;

  const sourceQuantities = quantities(from);
  for (const quantity of quantities(out)) if (!sourceQuantities.has(quantity)) return false;
  const originals = prohibitions(from); const warnings = prohibitions(out);
  if (originals.some((original) => !warnings.some((warning) => sameTopics(original, warning)))
    || warnings.some((warning) => !originals.some((original) => sameTopics(original, warning)))) return false;

  const allowed = allowedNumbers(from);
  for (const n of numbersIn(normalizedNumbers(out))) {
    if (!allowed.has(n)) return false;
  }

  return NEW_ADVICE_TERMS.every((term) => !out.includes(term) || from.includes(term));
}
