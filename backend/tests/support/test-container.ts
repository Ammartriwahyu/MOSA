import type { Container } from "../../src/composition-root";
import { ConfirmDose } from "../../src/modules/dosing/application/confirm-dose.use-case";
import { GetNextDose } from "../../src/modules/dosing/application/get-next-dose.use-case";
import { ListTodaysDoses } from "../../src/modules/dosing/application/list-todays-doses.use-case";
import type { ScanTokenVerifier } from "../../src/modules/dosing/application/ports/scan-token-verifier";
import { UnavailableScanTokenVerifier } from "../../src/modules/dosing/infrastructure/unavailable-scan-token-verifier";
import type { Clock } from "../../src/shared/domain/clock";
import { InMemoryDoseConfirmationRepository, InMemoryDosingMedicineReader } from "./in-memory-dosing";
import { DeleteHouseholdData } from "../../src/modules/household/application/delete-household-data.use-case";
import { EnsureHousehold } from "../../src/modules/household/application/ensure-household.use-case";
import { GetHousehold } from "../../src/modules/household/application/get-household.use-case";
import { RecordConsent } from "../../src/modules/household/application/record-consent.use-case";
import { UpdatePreferences } from "../../src/modules/household/application/update-preferences.use-case";
import { ExplainMedicineText } from "../../src/modules/medication/application/explain-medicine-text.use-case";
import {
  CreateMedicine,
  DeactivateMedicine,
  GetMedicine,
  ListMedicines,
  UpdateMedicine,
} from "../../src/modules/medication/application/medicine-use-cases";
import type { PlainLanguageExplainer } from "../../src/modules/medication/application/ports/plain-language-explainer";
import type { AccessTokenVerifier } from "../../src/shared/application/access-token-verifier";
import { CheckHealth, type DatabasePing } from "../../src/shared/application/check-health.use-case";
import type { LogEvent, Logger } from "../../src/shared/application/logger";
import { fixedClock } from "../../src/shared/domain/clock";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { InMemoryAccountEraser, InMemoryHouseholdRepository } from "./in-memory-household-repository";
import { InMemoryMedicineRepository } from "./in-memory-medicine-repository";

export const FRONTEND = "http://localhost:3000";
export const TEST_NOW = Date.parse("2026-11-10T03:00:00Z");

export type MemoryLogger = Logger & { events: LogEvent[] };

export function memoryLogger(): MemoryLogger {
  const events: LogEvent[] = [];
  return { events, info: (e) => events.push(e), error: (e) => events.push(e) };
}

// Explainer palsu bawaan: membalas teks yang lolos pagar keluaran untuk sumber apa pun.
export const echoExplainer: PlainLanguageExplainer = {
  explain: async (_householdId, text) => ok(`Minum obat ini: ${text.aturanPakai}`),
};

export const healthyDb: DatabasePing = { ping: async () => ok(undefined) };

/**
 * Verifier palsu: token tertentu memetakan ke userId tertentu.
 * "token-gangguan" mensimulasikan layanan Auth tidak terjangkau.
 */
export function fakeTokenVerifier(tokens: Record<string, string>): AccessTokenVerifier {
  return {
    verify: async (token) => {
      if (token === "token-gangguan") {
        return err(domainError("AUTH_UNAVAILABLE", "Layanan masuk sedang tidak dapat dihubungi."));
      }
      const userId = tokens[token];
      return userId
        ? ok({ userId })
        : err(domainError("UNAUTHENTICATED", "Sesi tidak valid. Silakan masuk lagi."));
    },
  };
}

export function testContainer(
  options: {
    database?: DatabasePing;
    tokens?: Record<string, string>;
    households?: InMemoryHouseholdRepository;
    eraser?: InMemoryAccountEraser;
    medicines?: InMemoryMedicineRepository;
    explainer?: PlainLanguageExplainer;
    clock?: Clock;
    confirmations?: InMemoryDoseConfirmationRepository;
    scanTokens?: ScanTokenVerifier;
  } = {},
): Container & { logger: MemoryLogger } {
  const households = options.households ?? new InMemoryHouseholdRepository();
  const eraser = options.eraser ?? new InMemoryAccountEraser(households);
  const medicines = options.medicines ?? new InMemoryMedicineRepository();
  const clock = options.clock ?? fixedClock(TEST_NOW);
  const dosingMedicines = new InMemoryDosingMedicineReader(medicines);
  const confirmations = options.confirmations ?? new InMemoryDoseConfirmationRepository(dosingMedicines);
  return {
    frontendOrigin: FRONTEND,
    logger: memoryLogger(),
    checkHealth: new CheckHealth(options.database ?? healthyDb),
    tokenVerifier: fakeTokenVerifier(options.tokens ?? {}),
    ensureHousehold: new EnsureHousehold(households),
    getNextDose: new GetNextDose(dosingMedicines, confirmations, clock),
    dosing: {
      listTodaysDoses: new ListTodaysDoses(dosingMedicines, confirmations, clock),
      confirmDose: new ConfirmDose(dosingMedicines, confirmations, options.scanTokens ?? new UnavailableScanTokenVerifier(), clock),
    },
    household: {
      getHousehold: new GetHousehold(households),
      recordConsent: new RecordConsent(households, fixedClock(TEST_NOW)),
      updatePreferences: new UpdatePreferences(households),
      deleteHouseholdData: new DeleteHouseholdData(households, eraser),
    },
    medication: {
      explainMedicineText: new ExplainMedicineText(options.explainer ?? echoExplainer),
      createMedicine: new CreateMedicine(medicines, fixedClock(TEST_NOW)),
      updateMedicine: new UpdateMedicine(medicines),
      listMedicines: new ListMedicines(medicines),
      getMedicine: new GetMedicine(medicines),
      deactivateMedicine: new DeactivateMedicine(medicines),
    },
  };
}
