import type { Env } from "./config/env";
import { DeleteHouseholdData } from "./modules/household/application/delete-household-data.use-case";
import { EnsureHousehold } from "./modules/household/application/ensure-household.use-case";
import { GetHousehold } from "./modules/household/application/get-household.use-case";
import { RecordConsent } from "./modules/household/application/record-consent.use-case";
import { UpdatePreferences } from "./modules/household/application/update-preferences.use-case";
import { SupabaseAccountEraser } from "./modules/household/infrastructure/supabase-account-eraser";
import { SupabaseHouseholdRepository } from "./modules/household/infrastructure/supabase-household.repository";
import type { HouseholdUseCases } from "./modules/household/interface/household.routes";
import { ExplainMedicineText } from "./modules/medication/application/explain-medicine-text.use-case";
import {
  CreateMedicine,
  DeactivateMedicine,
  GetMedicine,
  ListMedicines,
  UpdateMedicine,
} from "./modules/medication/application/medicine-use-cases";
import { RateLimitedExplainer } from "./modules/medication/application/rate-limited-explainer";
import { GeminiPlainLanguageExplainer } from "./modules/medication/infrastructure/gemini-plain-language-explainer";
import { SupabaseMedicineRepository } from "./modules/medication/infrastructure/supabase-medicine.repository";
import type { MedicationUseCases } from "./modules/medication/interface/medication.routes";
import type { AccessTokenVerifier } from "./shared/application/access-token-verifier";
import { CheckHealth } from "./shared/application/check-health.use-case";
import type { Logger } from "./shared/application/logger";
import { createGeminiGenerateContent, GeminiJsonGenerator } from "./shared/infrastructure/gemini-json-generator";
import { createJsonLogger } from "./shared/infrastructure/json-logger";
import { SupabaseAiUsageLimiter } from "./shared/infrastructure/supabase-ai-usage-limiter";
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
  medication: MedicationUseCases;
};

export function buildContainer(env: Env): Container {
  // Satu klien Supabase per proses.
  const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  const households = new SupabaseHouseholdRepository(supabase);
  const medicines = new SupabaseMedicineRepository(supabase);
  // Satu klien Gemini per proses, dipakai bersama penjelasan obat dan (nanti) baca kemasan.
  const gemini = new GeminiJsonGenerator(createGeminiGenerateContent(env.GEMINI_API_KEY), {
    model: env.GEMINI_MODEL,
  });
  const aiUsage = new SupabaseAiUsageLimiter(supabase, systemClock, env.AI_DAILY_LIMIT);
  const explainer = new RateLimitedExplainer(new GeminiPlainLanguageExplainer(gemini), aiUsage);

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
    medication: {
      explainMedicineText: new ExplainMedicineText(explainer),
      createMedicine: new CreateMedicine(medicines, systemClock),
      updateMedicine: new UpdateMedicine(medicines),
      listMedicines: new ListMedicines(medicines),
      getMedicine: new GetMedicine(medicines),
      deactivateMedicine: new DeactivateMedicine(medicines),
    },
  };
}
