import type { DomainError } from "../domain/domain-error";
import type { Result } from "../domain/result";

export interface DatabasePing {
  ping(): Promise<Result<void, DomainError>>;
}

export class CheckHealth {
  constructor(private readonly database: DatabasePing) {}

  execute(): Promise<Result<void, DomainError>> {
    return this.database.ping();
  }
}
