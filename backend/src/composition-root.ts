import type { Env } from "./config/env";
import { CheckHealth } from "./shared/application/check-health.use-case";
import type { Logger } from "./shared/application/logger";
import { createJsonLogger } from "./shared/infrastructure/json-logger";
import { createSupabaseAdminClient } from "./shared/infrastructure/supabase-client";
import { SupabaseDatabasePing } from "./shared/infrastructure/supabase-database-ping";

// Satu-satunya tempat merakit repository, adaptor, dan use case (docs/03 §4).
// Container hanya berisi port dan use case, sehingga tes bisa merakit versi palsu.
export type Container = {
  frontendOrigin: string;
  logger: Logger;
  checkHealth: CheckHealth;
};

export function buildContainer(env: Env): Container {
  // Satu klien Supabase per proses.
  const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

  return {
    frontendOrigin: env.FRONTEND_ORIGIN,
    logger: createJsonLogger(),
    checkHealth: new CheckHealth(new SupabaseDatabasePing(supabase)),
  };
}
