import type { AiUsageLimiter } from "../../../shared/application/ai-usage-limiter";
import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { ExplainerText, PlainLanguageExplainer } from "./ports/plain-language-explainer";

/**
 * Dekorator jatah harian (docs/03 §11): jatah dipotong sebelum AI dipanggil,
 * sehingga panggilan yang gagal tetap terhitung, sama seperti kuota Gemini.
 */
export class RateLimitedExplainer implements PlainLanguageExplainer {
  constructor(
    private readonly inner: PlainLanguageExplainer,
    private readonly limiter: AiUsageLimiter,
  ) {}

  async explain(householdId: string, text: ExplainerText): Promise<Result<string, DomainError>> {
    const quota = await this.limiter.consume(householdId);
    if (!quota.ok) return quota;
    return this.inner.explain(householdId, text);
  }
}
