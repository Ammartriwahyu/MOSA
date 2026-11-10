import type { Env } from "./config/env";
import { DeleteHouseholdData } from "./modules/household/application/delete-household-data.use-case";
import { EnsureHousehold } from "./modules/household/application/ensure-household.use-case";
import { GetHousehold } from "./modules/household/application/get-household.use-case";
import { RecordConsent } from "./modules/household/application/record-consent.use-case";
import { UpdatePreferences } from "./modules/household/application/update-preferences.use-case";
import { SupabaseAccountEraser } from "./modules/household/infrastructure/supabase-account-eraser";
import { SupabaseHouseholdRepository } from "./modules/household/infrastructure/supabase-household.repository";
import type { HouseholdUseCases } from "./modules/household/interface/household.routes";
import type { AccessTokenVerifier } from "./shared/application/access-token-verifier";
import { CheckHealth } from "./shared/application/check-health.use-case";
import type { Logger } from "./shared/application/logger";
import { createJsonLogger } from "./shared/infrastructure/json-logger";
import { SupabaseAccessTokenVerifier } from "./shared/infrastructure/supabase-access-token-verifier";
import { createSupabaseAdminClient } from "./shared/infrastructure/supabase-client";
import { SupabaseDatabasePing } from "./shared/infrastructure/supabase-database-ping";
import { systemClock } from "./shared/infrastructure/system-clock";

// Satu-satunya tempat merakit repository, adaptor, dan use case (docs/03 §4).
// Container hanya berisi port dan use case, sehingga tes bisa merakit versi palsu.
export type Container = {
  frontendOrigin: string;
  logger: Logger;
  checkHealth: CheckHealth;
  tokenVerifier: AccessTokenVerifier;
  ensureHousehold: EnsureHousehold;
  household: HouseholdUseCases;
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
    household: {
      getHousehold: new GetHousehold(households),
      recordConsent: new RecordConsent(households, systemClock),
      updatePreferences: new UpdatePreferences(households),
      deleteHouseholdData: new DeleteHouseholdData(households, new SupabaseAccountEraser(supabase)),
    },
  };
}
