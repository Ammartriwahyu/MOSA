import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";

export interface AccountEraser {
  eraseAccount(ownerUserId: string): Promise<Result<void, DomainError>>;
}
