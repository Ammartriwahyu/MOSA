import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import { LIMITS } from "../domain/medicine";
import { isFaithfulExplanation } from "../domain/services/explanation-guard";
import type { ExplainerText, PlainLanguageExplainer } from "./ports/plain-language-explainer";

export const AI_INPUT_FIELDS = ["aturanPakai", "larangan", "catatan"] as const;

export type ExplainInput = {
  readonly householdId: string;
  readonly usageRule: string;
  readonly warnings: string;
  readonly notes: string | null;
};

export function toExplainerText(input: Omit<ExplainInput, "householdId">): ExplainerText {

  return {
    aturanPakai: input.usageRule.trim(),
    larangan: input.warnings.trim(),
    catatan: input.notes?.trim() || null,
  };
}

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

    const source = [text.aturanPakai, text.larangan, text.catatan ?? ""].join("\n");
    return isFaithfulExplanation(source, result.value)
      ? ok(result.value)
      : err(domainError("AI_UNAVAILABLE", "Penjelasan AI tidak lolos pemeriksaan."));
  }
}
