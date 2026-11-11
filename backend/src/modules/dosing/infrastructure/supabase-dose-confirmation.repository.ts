import { z } from "zod";
import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { WibDate } from "../../../shared/domain/wib-time";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client";
import type { ConfirmedDoseReader } from "../application/ports/confirmed-dose-reader";
import type { DoseConfirmation, DoseConfirmationRepository } from "../domain/dose-confirmation";
import { createDoseSlot } from "../domain/dose-slot";
import { DOSE_WINDOW } from "../domain/dose-window";
import { databaseUnavailable, toConfirmation } from "./dosing-data";

const responseSchema = z.object({ code: z.enum(["OK", "NOT_FOUND", "VALIDATION_FAILED", "DOSE_ALREADY_CONFIRMED", "DOSE_NOT_DUE", "DOSE_MISSED"]), confirmation: z.unknown().optional() });

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
    try {
      const { data, error } = await this.client.rpc("confirm_dose", {
        p_household_id: input.householdId, p_medicine_id: input.slot.medicineId,
        p_scheduled_date: input.slot.scheduledDate, p_scheduled_time: input.slot.scheduledTime,
        p_confirmed_at: new Date(input.confirmedAt).toISOString(), p_level: input.level,
        p_opens_before_minutes: DOSE_WINDOW.opensBeforeMinutes, p_closes_after_minutes: DOSE_WINDOW.closesAfterMinutes,
      }).retry(false);
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
