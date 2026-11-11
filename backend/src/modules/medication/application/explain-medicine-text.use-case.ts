import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import { LIMITS } from "../domain/medicine";
import { isFaithfulExplanation } from "../domain/services/explanation-guard";
import type { ExplainerText, PlainLanguageExplainer } from "./ports/plain-language-explainer";

/** Kolom formulir yang dikirim ke AI (docs/01 §2, D4: kegunaan tidak dikirim). Satu tempat untuk diubah. */
export const AI_INPUT_FIELDS = ["aturanPakai", "larangan", "catatan"] as const;

/** Nama kolom mengikuti formulir obat (MedicineInput), agar galat menunjuk kolom yang sama. */
export type ExplainInput = {
  readonly householdId: string;
  readonly usageRule: string;
  readonly warnings: string;
  readonly notes: string | null;
};

/** Memilih hanya kolom yang diizinkan, sehingga kolom lain tidak bisa ikut terkirim. */
export function toExplainerText(input: Omit<ExplainInput, "householdId">): ExplainerText {
  // Objek baru berisi tepat AI_INPUT_FIELDS; properti tambahan pada `input` ditinggalkan.
  return {
    aturanPakai: input.usageRule.trim(),
    larangan: input.warnings.trim(),
    catatan: input.notes?.trim() || null,
  };
}

/**
 * Membuat draf penjelasan sederhana (docs/03 §8.1), lalu memeriksanya dengan
 * pagar keluaran domain. Tidak menyimpan apa pun:
 * penjelasan baru tersimpan bila pengisi menekan "Ya, sudah benar" (CreateMedicine).
 */
export class ExplainMedicineText {
  constructor(private readonly explainer: PlainLanguageExplainer) {}

  async execute(input: ExplainInput): Promise<Result<string, DomainError>> {
    const text = toExplainerText(input);
    if (!text.aturanPakai || text.aturanPakai.length > LIMITS.usageRule || !text.larangan || text.larangan.length > LIMITS.warnings) {
      return err(domainError("VALIDATION_FAILED", "Isi aturan pakai dan larangan.", { fields: ["usageRule", "warnings"] }));
    }
    if (text.catatan && text.catatan.length > LIMITS.notes) {
      return err(domainError("VALIDATION_FAILED", "Catatan terlalu panjang.", { fields: ["notes"] }));
    }
    const result = await this.explainer.explain(input.householdId, text);
    if (!result.ok) return result;
    // Hasil yang menambah angka atau anjuran baru diperlakukan sama dengan AI gagal (docs/04).
    const source = [text.aturanPakai, text.larangan, text.catatan ?? ""].join("\n");
    return isFaithfulExplanation(source, result.value)
      ? ok(result.value)
      : err(domainError("AI_UNAVAILABLE", "Penjelasan AI tidak lolos pemeriksaan."));
  }
}
