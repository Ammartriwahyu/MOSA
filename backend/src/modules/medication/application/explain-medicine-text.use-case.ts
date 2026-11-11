import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, type Result } from "../../../shared/domain/result";
import { LIMITS } from "../domain/medicine";
import type { ExplainerText, PlainLanguageExplainer } from "./ports/plain-language-explainer";

/** Kolom formulir yang dikirim ke AI (docs/01 §2, D4: kegunaan tidak dikirim). Satu tempat untuk diubah. */
export const AI_INPUT_FIELDS = ["aturanPakai", "larangan", "catatan"] as const;

export type ExplainInput = {
  readonly householdId: string;
  readonly aturanPakai: string;
  readonly larangan: string;
  readonly catatan: string | null;
};

/** Memilih hanya kolom yang diizinkan, sehingga kolom lain tidak bisa ikut terkirim. */
export function toExplainerText(input: ExplainerText): ExplainerText {
  // Objek baru berisi tepat AI_INPUT_FIELDS; properti tambahan pada `input` ditinggalkan.
  return {
    aturanPakai: input.aturanPakai.trim(),
    larangan: input.larangan.trim(),
    catatan: input.catatan?.trim() || null,
  };
}

/**
 * Membuat draf penjelasan sederhana (docs/03 §8.1). Tidak menyimpan apa pun:
 * penjelasan baru tersimpan bila pengisi menekan "Ya, sudah benar" (CreateMedicine).
 */
export class ExplainMedicineText {
  constructor(private readonly explainer: PlainLanguageExplainer) {}

  async execute(input: ExplainInput): Promise<Result<string, DomainError>> {
    const text = toExplainerText(input);
    if (!text.aturanPakai || text.aturanPakai.length > LIMITS.usageRule || !text.larangan || text.larangan.length > LIMITS.warnings) {
      return err(domainError("VALIDATION_FAILED", "Isi aturan pakai dan larangan.", { fields: ["aturanPakai", "larangan"] }));
    }
    if (text.catatan && text.catatan.length > LIMITS.notes) {
      return err(domainError("VALIDATION_FAILED", "Catatan terlalu panjang.", { fields: ["catatan"] }));
    }
    return this.explainer.explain(input.householdId, text);
  }
}
