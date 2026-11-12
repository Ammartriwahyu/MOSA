// Normalisasi nama obat untuk pencocokan (docs/01 §5, docs/03 §6.2). Fungsi murni.
// Dipakai bersama medication dan verification; tidak bergantung pada salah satu modul.

/** Kata bentuk garam dan sediaan yang tidak membedakan obat (docs/01 §5). */
const IGNORED_WORDS = new Set([
  "besilat",
  "besylate",
  "hcl",
  "hidroklorida",
  "hydrochloride", // USULAN: padanan bahasa Inggris dari kata di docs/01
  "natrium",
  "sodium",
  "tablet",
  "tab",
  "kaplet",
  "caplet",
  "kapsul",
  "capsule",
]);

/** Satuan kekuatan; kata ini dibuang dari nama bila ikut terbaca (USULAN). */
const UNIT_WORDS = new Set(["mg", "mcg", "g", "ml", "iu", "miligram", "mikrogram", "gram"]);

function normalizeWord(word: string): string {
  // Samakan akhiran -ine dengan -in: "amlodipine" → "amlodipin" (docs/01 §5, USULAN).
  return word.endsWith("ine") ? word.slice(0, -1) : word;
}

/**
 * huruf kecil → buang tanda baca → buang kata garam/sediaan, satuan, dan token
 * berangka (kekuatan yang ikut terbaca) → samakan -ine/-in → rapatkan spasi.
 * Hasil kosong berarti tidak ada nama yang bisa dicocokkan.
 */
export function normalizeMedicineName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .filter((word) => !IGNORED_WORDS.has(word) && !UNIT_WORDS.has(word) && !/\d/.test(word))
    .map(normalizeWord)
    .join(" ");
}
