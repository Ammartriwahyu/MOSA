import type { Env } from "./config/env";
import { EnsureHousehold } from "./modules/household/application/ensure-household.use-case";
import { SupabaseHouseholdRepository } from "./modules/household/infrastructure/supabase-household.repository";
import type { AccessTokenVerifier } from "./shared/application/access-token-verifier";
import { CheckHealth } from "./shared/application/check-health.use-case";
import type { Logger } from "./shared/application/logger";
import { createJsonLogger } from "./shared/infrastructure/json-logger";
import { SupabaseAccessTokenVerifier } from "./shared/infrastructure/supabase-access-token-verifier";
import { createSupabaseAdminClient } from "./shared/infrastructure/supabase-client";
import { SupabaseDatabasePing } from "./shared/infrastructure/supabase-database-ping";

// Satu-satunya tempat merakit repository, adaptor, dan use case (docs/03 §4).
// Container hanya berisi port dan use case, sehingga tes bisa merakit versi palsu.
export type Container = {
  frontendOrigin: string;
  logger: Logger;
  checkHealth: CheckHealth;
  tokenVerifier: AccessTokenVerifier;
  ensureHousehold: EnsureHousehold;
};

export function buildContainer(env: Env): Container {
  // Satu klien Supabase per proses.
  const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  const households = new SupabaseHouseholdRepository(supabase);

  return {
    frontendOrigin: env.FRONTEND_ORIGIN,
    logger: createJsonLogger(),
    checkHealth: new CheckHealth(new SupabaseDatabasePing(supabase)),
    tokenVerifier: new SupabaseAccessTokenVerifier(supabase),
    ensureHousehold: new EnsureHousehold(households),
  };
}
