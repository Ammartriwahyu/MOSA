import { ConfirmDose } from "../../src/modules/dosing/application/confirm-dose.use-case";
import { ListTodaysDoses } from "../../src/modules/dosing/application/list-todays-doses.use-case";
import type { ScanTokenClaims, ScanTokenVerifier } from "../../src/modules/dosing/application/ports/scan-token-verifier";
import type { Medicine } from "../../src/modules/medication/domain/medicine";
import { domainError, type DomainError } from "../../src/shared/domain/domain-error";
import { err, type Result } from "../../src/shared/domain/result";
import { atWib } from "./dosing-fixtures";
import { InMemoryDoseConfirmationRepository, InMemoryDosingMedicineReader } from "./in-memory-dosing";
import { InMemoryMedicineRepository } from "./in-memory-medicine-repository";

export const DOSE_MEDICINE: Medicine = {
  id: "obat-a", householdId: "rumah-a", name: "Obat Uji", nameNormalized: "obatuji", strength: "5 mg", strengthNormalized: "5mg",
  purpose: "Kegunaan uji", doseAmount: "1 tablet", usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null,
  intakeTimes: ["07:00", "19:00"], intakeDays: [1, 2, 3, 4, 5, 6, 7], labelSource: "keluarga", explanation: null, explanationOrigin: "teks_pengisi", active: true, createdAt: atWib("2026-11-01", "00:00"),
};
export const slotId = (time: string, date = "20261111", medicineId = "obat-a") => `${medicineId}:${date}:${time.replace(":", "")}`;

export function dosingTestSystem(start = atWib("2026-11-11", "07:30")) {
  let now = start;
  let tokenResult: Result<ScanTokenClaims, DomainError> = err(domainError("SCAN_TOKEN_INVALID", "Token uji tidak sah."));
  const clock = { now: () => now };
  const medicines = new InMemoryMedicineRepository();
  medicines.rows.set(DOSE_MEDICINE.id, { ...DOSE_MEDICINE });
  const reader = new InMemoryDosingMedicineReader(medicines);
  const confirmations = new InMemoryDoseConfirmationRepository(reader);
  const tokenCalls: string[] = [];
  const tokens: ScanTokenVerifier = { verify: async (token) => { tokenCalls.push(token); return tokenResult; } };
  return {
    medicines, reader, confirmations, tokens, tokenCalls, clock,
    confirm: new ConfirmDose(reader, confirmations, tokens, clock), list: new ListTodaysDoses(reader, confirmations, clock),
    setNow: (value: number) => { now = value; }, setToken: (value: Result<ScanTokenClaims, DomainError>) => { tokenResult = value; },
  };
}
