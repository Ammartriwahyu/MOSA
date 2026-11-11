import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";

/**
 * Teks yang boleh dikirim ke AI (docs/01 §2, docs/04 pengaman #1): hanya aturan
 * pakai, larangan, dan catatan. Tipe sengaja tidak punya kolom nama obat, nama
 * pasien, email, atau kegunaan (keputusan D4).
 */
export type ExplainerText = {
  readonly aturanPakai: string;
  readonly larangan: string;
  readonly catatan: string | null;
};

/**
 * Port penyederhana kalimat (Gemini di infrastruktur, feat/be-ai-explainer).
 * householdId hanya untuk pembatas jatah harian, tidak pernah dikirim ke AI.
 * Gagal → AI_UNAVAILABLE atau AI_QUOTA_EXCEEDED.
 */
export interface PlainLanguageExplainer {
  explain(householdId: string, text: ExplainerText): Promise<Result<string, DomainError>>;
}
