import type { AiUsageLimiter } from "../application/ai-usage-limiter";
import type { Clock } from "../domain/clock";
import { domainError, type DomainError } from "../domain/domain-error";
import { err, ok, type Result } from "../domain/result";
import { toWib } from "../domain/wib-time";
import type { AdminClient } from "./supabase-client";

/** Menghitung jatah lewat fungsi SQL atomik `consume_ai_usage` (per hari WIB). */
export class SupabaseAiUsageLimiter implements AiUsageLimiter {
  constructor(
    private readonly client: AdminClient,
    private readonly clock: Clock,
    private readonly dailyLimit: number,
  ) {}

  async consume(householdId: string): Promise<Result<void, DomainError>> {
    try {
      const { data, error } = await this.client.rpc("consume_ai_usage", {
        p_household_id: householdId,
        p_day: toWib(this.clock.now()).date,
        p_limit: this.dailyLimit,
      });
      if (error) return err(domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi."));
      return data === true
        ? ok(undefined)
        : err(domainError("AI_QUOTA_EXCEEDED", "Jatah AI hari ini sudah habis."));
    } catch {
      return err(domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi."));
    }
  }
}
