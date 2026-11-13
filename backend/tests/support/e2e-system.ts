import { serve } from "@hono/node-server";
import type { Container } from "../../src/composition-root";
import { createApp } from "../../src/create-app";
import { ConfirmDose } from "../../src/modules/dosing/application/confirm-dose.use-case";
import { GetScanContext } from "../../src/modules/dosing/application/get-scan-context.use-case";
import { ListTodaysDoses } from "../../src/modules/dosing/application/list-todays-doses.use-case";
import { SupabaseDoseConfirmationRepository } from "../../src/modules/dosing/infrastructure/supabase-dose-confirmation.repository";
import { SupabaseDosingMedicineReader } from "../../src/modules/dosing/infrastructure/supabase-dosing-medicine-reader";
import { DeleteHouseholdData } from "../../src/modules/household/application/delete-household-data.use-case";
import { EnsureHousehold } from "../../src/modules/household/application/ensure-household.use-case";
import { GetHousehold } from "../../src/modules/household/application/get-household.use-case";
import { RecordConsent } from "../../src/modules/household/application/record-consent.use-case";
import { UpdatePreferences } from "../../src/modules/household/application/update-preferences.use-case";
import { SupabaseAccountEraser } from "../../src/modules/household/infrastructure/supabase-account-eraser";
import { SupabaseHouseholdRepository } from "../../src/modules/household/infrastructure/supabase-household.repository";
import { ExplainMedicineText } from "../../src/modules/medication/application/explain-medicine-text.use-case";
import { CreateMedicine, DeactivateMedicine, GetMedicine, ListMedicines, UpdateMedicine } from "../../src/modules/medication/application/medicine-use-cases";
import { RateLimitedExplainer } from "../../src/modules/medication/application/rate-limited-explainer";
import { SupabaseMedicineRepository } from "../../src/modules/medication/infrastructure/supabase-medicine.repository";
import { VerifyPackage } from "../../src/modules/verification/application/verify-package.use-case";
import type { PackageReading } from "../../src/modules/verification/domain/package-reading";
import { CurrentMedicineScanTokenVerifier, HmacScanTokens } from "../../src/modules/verification/infrastructure/hmac-scan-tokens";
import { DosingScanContextReader, HouseholdScanConsentReader } from "../../src/modules/verification/infrastructure/scan-context-adapters";
import { CheckHealth } from "../../src/shared/application/check-health.use-case";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { SupabaseAccessTokenVerifier } from "../../src/shared/infrastructure/supabase-access-token-verifier";
import { SupabaseAiUsageLimiter } from "../../src/shared/infrastructure/supabase-ai-usage-limiter";
import { SupabaseDatabasePing } from "../../src/shared/infrastructure/supabase-database-ping";
import { migratedDatabase } from "./sql-database";
import { e2eSupabase } from "./e2e-supabase";
import { memoryLogger } from "./test-container";

export const E2E_START = Date.parse("2026-11-11T23:00:00Z"); // 12 November, 06.00 WIB.

/** Backend HTTP sungguhan + SDK/adaptor/SQL/HMAC asli; hanya Auth/AI/transport
 * Supabase yang diganti khusus tes. Tidak menyalakan rute pratinjau produksi.
 */
export async function e2eSystem() {
  const db = await migratedDatabase();
  const transport = await e2eSupabase(db); const admin = transport.admin;
  let now = E2E_START;
  const clock = { now: () => now }; const logger = memoryLogger();
  const households = new SupabaseHouseholdRepository(admin); const getHousehold = new GetHousehold(households);
  const medicines = new SupabaseMedicineRepository(admin); const reader = new SupabaseDosingMedicineReader(admin);
  const confirmations = new SupabaseDoseConfirmationRepository(admin);
  const quota = new SupabaseAiUsageLimiter(admin, clock, 20);
  const tokens = new HmacScanTokens("e2e-only-scan-secret-never-for-production", clock);
  let explainFails = false; let scanFails = false; let scanCalls = 0;
  let reading: PackageReading = { names: ["Amlodipine besylate"], strength: "5 mg", legible: true };
  const explainFields: string[][] = [];
  const container: Container = {
    frontendOrigin: "http://localhost:3000", logger, checkHealth: new CheckHealth(new SupabaseDatabasePing(admin)),
    tokenVerifier: new SupabaseAccessTokenVerifier(admin), ensureHousehold: new EnsureHousehold(households),
    household: { getHousehold, recordConsent: new RecordConsent(households, clock), updatePreferences: new UpdatePreferences(households), deleteHouseholdData: new DeleteHouseholdData(households, new SupabaseAccountEraser(admin)) },
    medication: {
      explainMedicineText: new ExplainMedicineText(new RateLimitedExplainer({ explain: async (_house, text) => {
        explainFields.push(Object.keys(text).sort());
        return explainFails ? err(domainError("AI_UNAVAILABLE", "AI uji gagal.")) : ok([text.aturanPakai, text.larangan, text.catatan].filter(Boolean).join(". "));
      } }, quota)),
      createMedicine: new CreateMedicine(medicines, clock), updateMedicine: new UpdateMedicine(medicines),
      getMedicine: new GetMedicine(medicines), listMedicines: new ListMedicines(medicines), deactivateMedicine: new DeactivateMedicine(medicines),
    },
    dosing: { listTodaysDoses: new ListTodaysDoses(reader, confirmations, clock), confirmDose: new ConfirmDose(reader, confirmations, new CurrentMedicineScanTokenVerifier(tokens, reader), clock) },
    scan: { verifyPackage: new VerifyPackage(new HouseholdScanConsentReader(getHousehold), quota, { read: async () => {
      scanCalls += 1;
      return scanFails ? err(domainError("AI_UNAVAILABLE", "AI uji gagal.")) : ok(reading);
    } }, new DosingScanContextReader(new GetScanContext(reader, confirmations)), tokens, clock) },
  };
  const app = createApp(container);
  let origin = "";
  const server = await new Promise<ReturnType<typeof serve>>((done, reject) => {
    const listening = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) => { origin = `http://127.0.0.1:${info.port}`; done(listening); });
    listening.once("error", reject);
  });
  async function reset() {
    await transport.reset(); logger.events.length = 0; explainFields.length = 0;
    now = E2E_START; explainFails = false; scanFails = false; scanCalls = 0;
    reading = { names: ["Amlodipine besylate"], strength: "5 mg", legible: true };
  }
  return { db, origin, logger, transport, explainFields, scanCalls: () => scanCalls,
    setNow: (value: string) => { now = Date.parse(value); },
    failExplain: () => { explainFails = true; }, failScan: () => { scanFails = true; },
    setReading: (value: PackageReading) => { reading = value; }, reset,
    async register(email = "keluarga@example.invalid") {
      const result = await transport.publicClient().auth.signUp({ email, password: "password-fiktif-e2e", options: { data: { display_name: "Keluarga Uji" } } });
      if (result.error || !result.data.session || !result.data.user) throw new Error("Pendaftaran SDK fixture gagal.");
      return { token: result.data.session.access_token, userId: result.data.user.id };
    },
    async close() { await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done())); await db.close(); },
  };
}
export type E2eSystem = Awaited<ReturnType<typeof e2eSystem>>;
