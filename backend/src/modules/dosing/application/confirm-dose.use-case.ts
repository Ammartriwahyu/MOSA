import type { Clock } from "../../../shared/domain/clock";
import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import { buildDailySlots } from "../domain/daily-slots";
import type { DoseConfirmation, DoseConfirmationRepository } from "../domain/dose-confirmation";
import { parseDoseSlotId } from "../domain/dose-slot";
import { classifyDose } from "../domain/dose-window";
import type { MedicineScheduleReader } from "./ports/medicine-schedule-reader";
import type { ScanTokenVerifier } from "./ports/scan-token-verifier";

export class ConfirmDose {
  constructor(private readonly medicines: MedicineScheduleReader, private readonly confirmations: DoseConfirmationRepository,
    private readonly tokens: ScanTokenVerifier, private readonly clock: Clock) {}

  async execute(input: { householdId: string; slotId: string; mode: "basic" | "verified"; scanToken?: string }): Promise<Result<{ confirmation: DoseConfirmation; serverTime: number }, DomainError>> {
    const slot = parseDoseSlotId(input.slotId);
    if (!slot.ok) return slot;
    const medicine = await this.medicines.findActive(input.householdId, slot.value.medicineId);
    if (!medicine.ok) return medicine;
    if (!medicine.value?.active || medicine.value.medicineId !== slot.value.medicineId) return err(domainError("NOT_FOUND", "Obat tidak ditemukan."));
    const recorded = await this.confirmations.list(input.householdId, [slot.value.scheduledDate], slot.value.medicineId);
    if (!recorded.ok) return recorded;
    if (recorded.value.some((row) => row.scheduledTime === slot.value.scheduledTime && row.scheduledDate === slot.value.scheduledDate)) {
      return err(domainError("DOSE_ALREADY_CONFIRMED", "Dosis sudah dikonfirmasi."));
    }
    const slots = buildDailySlots([medicine.value], slot.value.scheduledDate);
    if (!slots.ok) return slots;
    if (!slots.value.some((candidate) => candidate.slotId === input.slotId)) return err(domainError("NOT_FOUND", "Slot dosis tidak ditemukan."));

    let expiresAt: number | null = null;
    if (input.mode === "verified") {
      if (!input.scanToken) return err(domainError("SCAN_TOKEN_INVALID", "Token scan tidak valid."));
      const token = await this.tokens.verify(input.scanToken);
      if (!token.ok) return token;
      if (token.value.householdId !== input.householdId || token.value.medicineId !== slot.value.medicineId || token.value.slotId !== input.slotId
        || !Number.isFinite(token.value.expiresAt)) {
        return err(domainError("SCAN_TOKEN_INVALID", "Token scan tidak valid atau kedaluwarsa."));
      }
      expiresAt = token.value.expiresAt;
    }
    const now = this.clock.now();
    if (expiresAt !== null && expiresAt <= now) return err(domainError("SCAN_TOKEN_INVALID", "Token scan kedaluwarsa."));
    const status = classifyDose({ scheduledAt: slot.value.scheduledAt, now, confirmed: false });
    if (status !== "jatuh_tempo") return err(domainError(status === "belum_tiba" ? "DOSE_NOT_DUE" : "DOSE_MISSED", "Dosis di luar jendela konfirmasi."));
    const saved = await this.confirmations.confirm({ householdId: input.householdId, slot: slot.value, confirmedAt: now, level: input.mode === "verified" ? "scan_terverifikasi" : "dasar" });
    return saved.ok ? ok({ confirmation: saved.value, serverTime: now }) : saved;
  }
}
