import type { GetScanContext } from "../../dosing/application/get-scan-context.use-case.js";
import type { GetHousehold } from "../../household/application/get-household.use-case.js";
import { ok } from "../../../shared/domain/result.js";
import type { ScanConsentReader, ScanContextReader, ScanSnapshot } from "../application/ports/scan-context-reader.js";
import type { VerificationDose } from "../domain/verification-outcome.js";

export class HouseholdScanConsentReader implements ScanConsentReader {
  constructor(private readonly households: GetHousehold) {}
  async hasConsent(householdId: string) {
    const result = await this.households.execute({ householdId });
    return result.ok ? ok(result.value.dataConsentAt !== null && result.value.scanConsentAt !== null) : result;
  }
}

export class DosingScanContextReader implements ScanContextReader {
  constructor(private readonly dosing: GetScanContext) {}
  async read(input: Parameters<ScanContextReader["read"]>[0]) {
    const result = await this.dosing.execute(input);
    if (!result.ok) return result;
    const doses: VerificationDose[] = result.value.doses.map(({ slotId, medicineId, scheduledAt, status, windowOpen }) => {
      const slot = { slotId, medicineId, scheduledAt };
      if (status === "jatuh_tempo") return { ...slot, status, windowOpen: true };
      if (status === "sudah") return { ...slot, status, windowOpen };
      return { ...slot, status, windowOpen: false };
    });
    const snapshot: ScanSnapshot = {
      medicines: result.value.medicines.map((medicine) => ({
        medicineId: medicine.medicineId, name: medicine.name, strength: medicine.strength, purpose: medicine.purpose,
        doseAmount: medicine.doseAmount, usageRule: medicine.usageRule, warnings: medicine.warnings, notes: medicine.notes,
        labelSource: medicine.labelSource, explanationOrigin: medicine.explanationOrigin,
        explanation: medicine.explanationOrigin === "ai_dikonfirmasi" ? medicine.explanation : null,
      })), doses,
      nextDoses: result.value.nextDoses.map(({ medicineId, nextDose }) => ({ medicineId, nextDose: nextDose ? {
        slot: { slotId: nextDose.slot.slotId, medicineId: nextDose.slot.medicineId, scheduledAt: nextDose.slot.scheduledAt },
        tanggal: nextDose.relativeDay, kelompok: nextDose.period, jam: nextDose.slot.scheduledTime,
      } : null })),
    };
    return ok(snapshot);
  }
}
