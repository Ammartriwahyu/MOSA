
const IGNORED_WORDS = new Set([
  "besilat",
  "besylate",
  "hcl",
  "hidroklorida",
  "hydrochloride",
  "natrium",
  "sodium",
  "tablet",
  "tab",
  "kaplet",
  "caplet",
  "kapsul",
  "capsule",
]);

const UNIT_WORDS = new Set(["mg", "mcg", "g", "ml", "iu", "miligram", "mikrogram", "gram"]);

function normalizeWord(word: string): string {

  return word.endsWith("ine") ? word.slice(0, -1) : word;
}

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
