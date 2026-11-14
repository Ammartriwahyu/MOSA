import type { AiUsageLimiter } from "../application/ai-usage-limiter.js";
import type { Clock } from "../domain/clock.js";
import { domainError, type DomainError } from "../domain/domain-error.js";
import { err, ok, type Result } from "../domain/result.js";
import { toWib } from "../domain/wib-time.js";
import type { AdminClient } from "./supabase-client.js";

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
