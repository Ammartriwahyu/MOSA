import type { DomainError } from "../domain/domain-error.js";
import type { Result } from "../domain/result.js";

export interface AiUsageLimiter {
  consume(householdId: string): Promise<Result<void, DomainError>>;
}
