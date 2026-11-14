import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";

export type ExplainerText = {
  readonly aturanPakai: string;
  readonly larangan: string;
  readonly catatan: string | null;
};

export interface PlainLanguageExplainer {
  explain(householdId: string, text: ExplainerText): Promise<Result<string, DomainError>>;
}
