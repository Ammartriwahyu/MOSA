import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import type { PackageMatch } from "./match-package.js";
import type { DoseContext, NonEmptySlots, VerificationOutcome, VerificationSlot } from "./verification-outcome.js";

function slotOnly({ slotId, medicineId, scheduledAt }: VerificationSlot): VerificationSlot {
  return { slotId, medicineId, scheduledAt };
}

function slotsInOrder(slots: readonly VerificationSlot[]): VerificationSlot[] {
  return slots.map(slotOnly)
    .sort((a, b) => a.scheduledAt - b.scheduledAt || a.slotId.localeCompare(b.slotId));
}

function nonEmpty(slots: readonly VerificationSlot[]): NonEmptySlots | null {
  const [first, ...rest] = slotsInOrder(slots);
  return first ? [first, ...rest] : null;
}

export function decideOutcome(match: PackageMatch, context: DoseContext): Result<VerificationOutcome, DomainError> {

  if (match.outcome !== "cocok") return ok(match);
  const { medicine, readStrength } = match;
  if (context.nextDose && context.nextDose.medicineId !== medicine.medicineId) {
    return err(domainError("VALIDATION_FAILED", "Konteks jadwal tidak sesuai.", { field: "nextDose" }));
  }
  const info = { medicine, readStrength, nextDose: context.nextDose };

  if (context.target.mode === "selected") {
    const slotId = context.target.slotId;
    const selected = context.doses.find((dose) => dose.slotId === slotId);
    if (!selected) return err(domainError("NOT_FOUND", "Jadwal yang dipilih tidak tersedia.", { field: "slotId" }));
    if (selected.medicineId === medicine.medicineId) {
      if (selected.status === "sudah") return ok({ outcome: "dosis_sudah_tercatat", ...info, slots: [slotOnly(selected)] });
      if (selected.status === "jatuh_tempo") return ok({ outcome: "bisa_konfirmasi", ...info, slots: [slotOnly(selected)] });
    }

  } else {
    const ownDoses = context.doses.filter((dose) => dose.medicineId === medicine.medicineId);
    const due = nonEmpty(ownDoses.filter((dose) => dose.status === "jatuh_tempo"));

    if (due) return ok({ outcome: "bisa_konfirmasi", ...info, slots: due });
    const confirmed = nonEmpty(ownDoses.filter((dose) => dose.status === "sudah" && dose.windowOpen));
    if (confirmed) return ok({ outcome: "dosis_sudah_tercatat", ...info, slots: confirmed });
  }

  const otherDueSlots = nonEmpty(context.doses.filter((dose) => dose.medicineId !== medicine.medicineId && dose.status === "jatuh_tempo"));
  if (otherDueSlots) return ok({ outcome: "tunggu_dulu", ...info, otherDueSlots });
  return ok({ outcome: "hanya_info", ...info });
}
