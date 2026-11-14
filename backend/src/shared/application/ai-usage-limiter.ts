import type { DomainError } from "../domain/domain-error";
import type { Result } from "../domain/result";

export interface AiUsageLimiter {
  consume(householdId: string): Promise<Result<void, DomainError>>;
}
