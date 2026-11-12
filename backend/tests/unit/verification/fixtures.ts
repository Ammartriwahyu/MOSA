import type { PackageMatch } from "../../../src/modules/verification/domain/match-package";
import type { PackageReading, RegisteredMedicine } from "../../../src/modules/verification/domain/package-reading";
import type { DoseContext, VerificationDose, VerificationSlot } from "../../../src/modules/verification/domain/verification-outcome";
import { parseStrength } from "../../../src/shared/domain/strength";

export const medicine: RegisteredMedicine = Object.freeze({ medicineId: "medicine-a", name: "Amlodipin", strength: "5 mg" });
export const other: RegisteredMedicine = Object.freeze({ medicineId: "medicine-b", name: "Obat Uji Hijau", strength: "10 mg" });
export const reading: PackageReading = Object.freeze({ names: Object.freeze(["Amlodipine besylate"]), strength: "5 MG", legible: true });

export const morning: VerificationSlot = Object.freeze({ slotId: "medicine-a:20261112:0700", medicineId: medicine.medicineId, scheduledAt: Date.UTC(2026, 10, 12, 0) });
export const nextSlot: VerificationSlot = Object.freeze({ slotId: "medicine-a:20261112:1900", medicineId: medicine.medicineId, scheduledAt: Date.UTC(2026, 10, 12, 12) });
export const otherSlot: VerificationSlot = Object.freeze({ ...morning, medicineId: other.medicineId, slotId: "medicine-b:20261112:0700" });

export function due(slot: VerificationSlot = morning): VerificationDose {
  return { ...slot, status: "jatuh_tempo", windowOpen: true };
}

export function confirmed(slot: VerificationSlot = morning, windowOpen = true): VerificationDose {
  return { ...slot, status: "sudah", windowOpen };
}

export function context(overrides: Partial<DoseContext> = {}): DoseContext {
  return { target: { mode: "generic" }, doses: [], nextDose: nextSlot, ...overrides };
}

export function matching(): PackageMatch {
  const readStrength = parseStrength("5 mg");
  if (!readStrength) throw new Error("Fixture kekuatan tidak valid");
  return { outcome: "cocok", medicine, readStrength };
}
