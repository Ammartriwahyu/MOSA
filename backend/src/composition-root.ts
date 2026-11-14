import type { Env } from "./config/env.js";
import { ConfirmDose } from "./modules/dosing/application/confirm-dose.use-case.js";
import { ListTodaysDoses } from "./modules/dosing/application/list-todays-doses.use-case.js";
import { GetScanContext } from "./modules/dosing/application/get-scan-context.use-case.js";
import { SupabaseDoseConfirmationRepository } from "./modules/dosing/infrastructure/supabase-dose-confirmation.repository.js";
import { SupabaseDosingMedicineReader } from "./modules/dosing/infrastructure/supabase-dosing-medicine-reader.js";
import type { DosingUseCases } from "./modules/dosing/interface/dosing.routes.js";
import { DeleteHouseholdData } from "./modules/household/application/delete-household-data.use-case.js";
import { EnsureHousehold } from "./modules/household/application/ensure-household.use-case.js";
import { GetHousehold } from "./modules/household/application/get-household.use-case.js";
import { RecordConsent } from "./modules/household/application/record-consent.use-case.js";
import { UpdatePreferences } from "./modules/household/application/update-preferences.use-case.js";
import { SupabaseAccountEraser } from "./modules/household/infrastructure/supabase-account-eraser.js";
import { SupabaseHouseholdRepository } from "./modules/household/infrastructure/supabase-household.repository.js";
import type { HouseholdUseCases } from "./modules/household/interface/household.routes.js";
import { ExplainMedicineText } from "./modules/medication/application/explain-medicine-text.use-case.js";
import {
  CreateMedicine,
  DeactivateMedicine,
  GetMedicine,
  ListMedicines,
  UpdateMedicine,
} from "./modules/medication/application/medicine-use-cases.js";
import { RateLimitedExplainer } from "./modules/medication/application/rate-limited-explainer.js";
import { GeminiPlainLanguageExplainer } from "./modules/medication/infrastructure/gemini-plain-language-explainer.js";
import { SupabaseMedicineRepository } from "./modules/medication/infrastructure/supabase-medicine.repository.js";
import type { MedicationUseCases } from "./modules/medication/interface/medication.routes.js";
import { VerifyPackage } from "./modules/verification/application/verify-package.use-case.js";
import { GeminiPackageReader } from "./modules/verification/infrastructure/gemini-package-reader.js";
import { HmacScanTokens, CurrentMedicineScanTokenVerifier } from "./modules/verification/infrastructure/hmac-scan-tokens.js";
import { DosingScanContextReader, HouseholdScanConsentReader } from "./modules/verification/infrastructure/scan-context-adapters.js";
import type { ScanUseCases } from "./modules/verification/interface/scan.routes.js";
import { SubscribePush, UnsubscribePush } from "./modules/notification/application/subscription.use-cases.js";
import { SendDueReminders } from "./modules/notification/application/send-due-reminders.use-case.js";
import { DosingDueDoseReader } from "./modules/notification/infrastructure/dosing-due-dose-reader.js";
import { SupabasePushSubscriptions, SupabaseReminderDispatches } from "./modules/notification/infrastructure/supabase-push-repositories.js";
import { WebPushSender } from "./modules/notification/infrastructure/web-push-sender.js";
import type { NotificationUseCases } from "./modules/notification/interface/notification.routes.js";
import type { AccessTokenVerifier } from "./shared/application/access-token-verifier.js";
import { CheckHealth } from "./shared/application/check-health.use-case.js";
import type { Logger } from "./shared/application/logger.js";
import { createGeminiGenerateContent, GeminiJsonGenerator } from "./shared/infrastructure/gemini-json-generator.js";
import { createJsonLogger } from "./shared/infrastructure/json-logger.js";
import { SupabaseAiUsageLimiter } from "./shared/infrastructure/supabase-ai-usage-limiter.js";
import { SupabaseAccessTokenVerifier } from "./shared/infrastructure/supabase-access-token-verifier.js";
import { createSupabaseAdminClient } from "./shared/infrastructure/supabase-client.js";
import { SupabaseDatabasePing } from "./shared/infrastructure/supabase-database-ping.js";
import { systemClock } from "./shared/infrastructure/system-clock.js";

export type Container = {
  frontendOrigin: string;
  logger: Logger;
  checkHealth: CheckHealth;
  tokenVerifier: AccessTokenVerifier;
  ensureHousehold: EnsureHousehold;
  household: HouseholdUseCases;
  medication: MedicationUseCases;
  dosing: DosingUseCases;
  scan: ScanUseCases;
  notification?: NotificationUseCases;
  cronSecret?: string;
};

export function buildContainer(env: Env): Container {

  const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  const households = new SupabaseHouseholdRepository(supabase);
  const medicines = new SupabaseMedicineRepository(supabase);
  const dosingMedicines = new SupabaseDosingMedicineReader(supabase);
  const confirmations = new SupabaseDoseConfirmationRepository(supabase);

  const gemini = new GeminiJsonGenerator(createGeminiGenerateContent(env.GEMINI_API_KEY), {
    model: env.GEMINI_MODEL,
  });
  const aiUsage = new SupabaseAiUsageLimiter(supabase, systemClock, env.AI_DAILY_LIMIT);
  const explainer = new RateLimitedExplainer(new GeminiPlainLanguageExplainer(gemini), aiUsage);
  const scanTokens = new HmacScanTokens(env.SCAN_TOKEN_SECRET, systemClock);
  let notification: NotificationUseCases | undefined;
  if (env.PUSH_ENABLED) {

    if (!env.CRON_SECRET || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
      throw new Error("Konfigurasi push belum lengkap.");
    }
    const subscriptions = new SupabasePushSubscriptions(supabase);
    notification = {
      subscribePush: new SubscribePush(subscriptions), unsubscribePush: new UnsubscribePush(subscriptions),
      sendDueReminders: new SendDueReminders(subscriptions,
        new DosingDueDoseReader(new ListTodaysDoses(dosingMedicines, confirmations, systemClock), new GetHousehold(households)),
        new SupabaseReminderDispatches(supabase), new WebPushSender({ subject: env.VAPID_SUBJECT,
          publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY })),
    };
  }

  return {
    frontendOrigin: env.FRONTEND_ORIGIN,
    notification,
    cronSecret: env.PUSH_ENABLED ? env.CRON_SECRET : undefined,
    logger: createJsonLogger(),
    checkHealth: new CheckHealth(new SupabaseDatabasePing(supabase)),
    tokenVerifier: new SupabaseAccessTokenVerifier(supabase),
    ensureHousehold: new EnsureHousehold(households),
    scan: { verifyPackage: new VerifyPackage(new HouseholdScanConsentReader(new GetHousehold(households)), aiUsage,
      new GeminiPackageReader(gemini), new DosingScanContextReader(new GetScanContext(dosingMedicines, confirmations)), scanTokens, systemClock) },
    dosing: {
      listTodaysDoses: new ListTodaysDoses(dosingMedicines, confirmations, systemClock),
      confirmDose: new ConfirmDose(dosingMedicines, confirmations, new CurrentMedicineScanTokenVerifier(scanTokens, dosingMedicines), systemClock),
    },
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
