import type { Env } from "./config/env";
import { ConfirmDose } from "./modules/dosing/application/confirm-dose.use-case";
import { ListTodaysDoses } from "./modules/dosing/application/list-todays-doses.use-case";
import { GetScanContext } from "./modules/dosing/application/get-scan-context.use-case";
import { SupabaseDoseConfirmationRepository } from "./modules/dosing/infrastructure/supabase-dose-confirmation.repository";
import { SupabaseDosingMedicineReader } from "./modules/dosing/infrastructure/supabase-dosing-medicine-reader";
import type { DosingUseCases } from "./modules/dosing/interface/dosing.routes";
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
import { VerifyPackage } from "./modules/verification/application/verify-package.use-case";
import { GeminiPackageReader } from "./modules/verification/infrastructure/gemini-package-reader";
import { HmacScanTokens, CurrentMedicineScanTokenVerifier } from "./modules/verification/infrastructure/hmac-scan-tokens";
import { DosingScanContextReader, HouseholdScanConsentReader } from "./modules/verification/infrastructure/scan-context-adapters";
import type { ScanUseCases } from "./modules/verification/interface/scan.routes";
import { SubscribePush, UnsubscribePush } from "./modules/notification/application/subscription.use-cases";
import { SendDueReminders } from "./modules/notification/application/send-due-reminders.use-case";
import { DosingDueDoseReader } from "./modules/notification/infrastructure/dosing-due-dose-reader";
import { SupabasePushSubscriptions, SupabaseReminderDispatches } from "./modules/notification/infrastructure/supabase-push-repositories";
import { WebPushSender } from "./modules/notification/infrastructure/web-push-sender";
import type { NotificationUseCases } from "./modules/notification/interface/notification.routes";
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
