import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { PackageMatch } from "./match-package";
import type { DoseContext, NonEmptySlots, VerificationOutcome, VerificationSlot } from "./verification-outcome";

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

/** Prioritas docs/01 §5. Status/jendela berasal dari satu snapshot Clock di dosing. */
export function decideOutcome(match: PackageMatch, context: DoseContext): Result<VerificationOutcome, DomainError> {
  // Bacaan gagal tidak boleh berubah menjadi konfirmasi hanya karena ada jadwal.
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
    // Target eksplisit tidak diganti ke slot lain, termasuk slot lain obat yang sama.
  } else {
    const ownDoses = context.doses.filter((dose) => dose.medicineId === medicine.medicineId);
    const due = nonEmpty(ownDoses.filter((dose) => dose.status === "jatuh_tempo"));
    // Q2: semua jendela tetap terbuka, pemanggil harus meminta pengguna memilih satu slot.
    if (due) return ok({ outcome: "bisa_konfirmasi", ...info, slots: due });
    const confirmed = nonEmpty(ownDoses.filter((dose) => dose.status === "sudah" && dose.windowOpen));
    if (confirmed) return ok({ outcome: "dosis_sudah_tercatat", ...info, slots: confirmed });
  }

  const otherDueSlots = nonEmpty(context.doses.filter((dose) => dose.medicineId !== medicine.medicineId && dose.status === "jatuh_tempo"));
  if (otherDueSlots) return ok({ outcome: "tunggu_dulu", ...info, otherDueSlots });
  return ok({ outcome: "hanya_info", ...info });
}
