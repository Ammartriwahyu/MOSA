import type { DomainError } from "../domain/domain-error";
import type { Result } from "../domain/result";

// Port: pembacaan ringan ke database. Juga menjaga proyek Supabase gratis
// tetap aktif saat dipanggil cron keep-alive (docs/03 §11).
export interface DatabasePing {
  ping(): Promise<Result<void, DomainError>>;
}

export class CheckHealth {
  constructor(private readonly database: DatabasePing) {}

  execute(): Promise<Result<void, DomainError>> {
    return this.database.ping();
  }
}
