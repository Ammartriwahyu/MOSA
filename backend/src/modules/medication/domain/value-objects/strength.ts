// Kekuatan obat = angka + satuan (docs/01 §2, §5). "5mg" = "5 mg" = "5 miligram";
// koma = titik desimal. Kekuatan berbeda = obat berbeda (CLAUDE.md aturan #3), jadi
// bentuk normal harus stabil dan tidak menebak.

const UNIT_ALIASES: Record<string, string> = {
  mg: "mg",
  miligram: "mg",
  milligram: "mg",
  mcg: "mcg",
  "µg": "mcg",
  ug: "mcg",
  mikrogram: "mcg",
  microgram: "mcg",
  g: "g",
  gram: "g",
  ml: "ml",
  mililiter: "ml",
  milliliter: "ml",
  iu: "iu",
  ui: "iu",
  "%": "%",
};

const PART = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zµ%]+)\s*$/i;

export type StrengthPart = { readonly value: number; readonly unit: string };

/** Satu kekuatan atau rasio sirup ("125 mg/5 ml"). */
export type Strength = { readonly parts: readonly StrengthPart[]; readonly normalized: string };

function parsePart(text: string): StrengthPart | null {
  const match = PART.exec(text);
  if (!match?.[1] || !match[2]) return null;
  const unit = UNIT_ALIASES[match[2].toLowerCase()];
  const value = Number(match[1].replace(",", "."));
  if (!unit || !Number.isFinite(value) || value <= 0) return null;
  return { value, unit };
}

/** null bila tidak bisa dipahami: jangan dianggap cocok dengan apa pun. */
export function parseStrength(raw: string): Strength | null {
  const pieces = raw.split("/");
  if (pieces.length > 2) return null;
  const parts = pieces.map(parsePart);
  if (parts.some((p) => p === null)) return null;
  const valid = parts as StrengthPart[];
  return {
    parts: valid,
    normalized: valid.map((p) => `${p.value}${p.unit}`).join("/"),
  };
}
