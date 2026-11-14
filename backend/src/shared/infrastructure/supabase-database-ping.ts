import type { AdminClient } from "./supabase-client.js";
import type { DatabasePing } from "../application/check-health.use-case.js";
import { domainError, type DomainError } from "../domain/domain-error.js";
import { err, ok, type Result } from "../domain/result.js";

const PING_TIMEOUT_MS = 5_000;

export class SupabaseDatabasePing implements DatabasePing {
  constructor(private readonly client: AdminClient) {}

  async ping(): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client
        .from("households")
        .select("id")
        .limit(1)
        .abortSignal(AbortSignal.timeout(PING_TIMEOUT_MS));
      if (!error) return ok(undefined);
    } catch {
      // Jaringan putus atau batas waktu: diperlakukan sama dengan galat database.
    }
    return err(domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi."));
  }
}
