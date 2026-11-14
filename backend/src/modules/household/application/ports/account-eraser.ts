import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";

export interface AccountEraser {
  eraseAccount(ownerUserId: string): Promise<Result<void, DomainError>>;
}
