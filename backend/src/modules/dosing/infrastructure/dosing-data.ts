import { z } from "zod";
import { domainError } from "../../../shared/domain/domain-error";
import { err, ok } from "../../../shared/domain/result";
import { parseWibDate } from "../../../shared/domain/wib-time";
import type { DoseConfirmation } from "../domain/dose-confirmation";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const databaseUnavailable = () => domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi.");
export const epoch = z.string().transform((value) => Date.parse(value)).refine(Number.isFinite);
export const confirmationRowSchema = z.object({
  id: z.string(), household_id: z.string(), medicine_id: z.string(), scheduled_date: z.string(),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/), confirmed_at: epoch,
  level: z.enum(["dasar", "scan_terverifikasi"]),
});

export function toConfirmation(raw: unknown) {
  const row = confirmationRowSchema.safeParse(raw);
  if (!row.success) return err(databaseUnavailable());
  const date = parseWibDate(row.data.scheduled_date);
  if (!date.ok) return err(databaseUnavailable());
  const value: DoseConfirmation = {
    id: row.data.id, householdId: row.data.household_id, medicineId: row.data.medicine_id,
    scheduledDate: date.value, scheduledTime: row.data.scheduled_time.slice(0, 5), confirmedAt: row.data.confirmed_at, level: row.data.level,
  };
  return ok(value);
}
