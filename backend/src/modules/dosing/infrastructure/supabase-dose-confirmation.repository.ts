import { z } from "zod";
import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import type { WibDate } from "../../../shared/domain/wib-time.js";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client.js";
import type { ConfirmedDoseReader } from "../application/ports/confirmed-dose-reader.js";
import type { DoseConfirmation, DoseConfirmationRepository } from "../domain/dose-confirmation.js";
import { createDoseSlot } from "../domain/dose-slot.js";
import { DOSE_WINDOW } from "../domain/dose-window.js";
import { databaseUnavailable, toConfirmation } from "./dosing-data.js";

const responseSchema = z.object({ code: z.enum(["OK", "NOT_FOUND", "VALIDATION_FAILED", "DOSE_ALREADY_CONFIRMED", "DOSE_NOT_DUE", "DOSE_MISSED", "SCAN_TOKEN_INVALID"]), confirmation: z.unknown().optional() });

export class SupabaseDoseConfirmationRepository implements DoseConfirmationRepository, ConfirmedDoseReader {
  constructor(private readonly client: AdminClient) {}

  async list(householdId: string, dates: readonly WibDate[], medicineId?: string): Promise<Result<readonly DoseConfirmation[], DomainError>> {
    if (dates.length === 0) return ok([]);
    try {
      let query = this.client.from("dose_confirmations").select("id, household_id, medicine_id, scheduled_date, scheduled_time, confirmed_at, level").eq("household_id", householdId).in("scheduled_date", [...dates]);
      if (medicineId) query = query.eq("medicine_id", medicineId);
      const { data, error } = await query.retry(false);
      if (error) return err(databaseUnavailable());
      const rows: DoseConfirmation[] = [];
      for (const raw of data) { const row = toConfirmation(raw); if (!row.ok) return row; rows.push(row.value); }
      return ok(rows);
    } catch { return err(databaseUnavailable()); }
  }

  async confirm(input: Parameters<DoseConfirmationRepository["confirm"]>[0]): Promise<Result<DoseConfirmation, DomainError>> {
    if (input.level === "scan_terverifikasi" && !input.scanMedicine) return err(domainError("SCAN_TOKEN_INVALID", "Bukti identitas kemasan tidak tersedia."));
    try {
      const args = {
        p_household_id: input.householdId, p_medicine_id: input.slot.medicineId,
        p_scheduled_date: input.slot.scheduledDate, p_scheduled_time: input.slot.scheduledTime,
        p_confirmed_at: new Date(input.confirmedAt).toISOString(), p_level: input.level,
        p_opens_before_minutes: DOSE_WINDOW.opensBeforeMinutes, p_closes_after_minutes: DOSE_WINDOW.closesAfterMinutes,
      };
      const request = input.level === "scan_terverifikasi" && input.scanMedicine
        ? this.client.rpc("confirm_scanned_dose", { ...args, p_expected_name: input.scanMedicine.name, p_expected_strength: input.scanMedicine.strength })
        : this.client.rpc("confirm_dose", args);
      const { data, error } = await request.retry(false);
      const result = responseSchema.safeParse(data);
      if (error || !result.success) return err(databaseUnavailable());
      if (result.data.code !== "OK") return err(domainError(result.data.code, "Konfirmasi dosis ditolak."));
      return toConfirmation(result.data.confirmation);
    } catch { return err(databaseUnavailable()); }
  }

  async listConfirmedSlotIds(input: { householdId: string; medicineId: string; dates: readonly WibDate[] }): Promise<Result<readonly string[], DomainError>> {
    const rows = await this.list(input.householdId, input.dates, input.medicineId);
    if (!rows.ok) return rows;
    const ids: string[] = [];
    for (const row of rows.value) {
      const slot = createDoseSlot({ medicineId: row.medicineId, scheduledDate: row.scheduledDate, scheduledTime: row.scheduledTime });
      if (!slot.ok) return err(databaseUnavailable());
      ids.push(slot.value.slotId);
    }
    return ok(ids);
  }
}
