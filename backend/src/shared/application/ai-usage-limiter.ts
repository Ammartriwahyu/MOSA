import type { DomainError } from "../domain/domain-error";
import type { Result } from "../domain/result";

/**
 * Jatah panggilan AI harian per rumah tangga (docs/04 pengaman #7). Dipakai
 * bersama oleh penjelasan obat dan baca kemasan. Satu `consume` = satu panggilan.
 * Gagal → AI_QUOTA_EXCEEDED (jatah habis) atau DATABASE_UNAVAILABLE.
 */
export interface AiUsageLimiter {
  consume(householdId: string): Promise<Result<void, DomainError>>;
}
