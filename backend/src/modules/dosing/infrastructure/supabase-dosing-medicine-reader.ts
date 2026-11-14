import { z } from "zod";
import type { DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client.js";
import type { DosingMedicine, DosingMedicineReader } from "../application/ports/dosing-medicine-reader.js";
import { databaseUnavailable, epoch, UUID } from "./dosing-data.js";

const COLUMNS = "id, active, created_at, intake_times, intake_times_started_at, name, strength, purpose, dose_amount, usage_rule, warnings, notes, label_source, explanation, explanation_origin";
const rowSchema = z.object({
  id: z.string(), active: z.boolean(), created_at: epoch, intake_times: z.array(z.string()),
  intake_times_started_at: z.record(z.string(), epoch), name: z.string(), strength: z.string(), purpose: z.string(),
  dose_amount: z.string(), usage_rule: z.string(), warnings: z.string().nullable(), notes: z.string().nullable(),
  label_source: z.enum(["apoteker", "keluarga"]), explanation: z.string().nullable(), explanation_origin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]),
});

function decode(raw: unknown): Result<DosingMedicine, DomainError> {
  const row = rowSchema.safeParse(raw);
  if (!row.success || row.data.intake_times.some((time) => row.data.intake_times_started_at[time] === undefined)) return err(databaseUnavailable());
  const value = row.data;
  return ok({
    medicineId: value.id, active: value.active, createdAt: value.created_at, intakeTimes: value.intake_times,
    intakeTimeStartedAt: value.intake_times_started_at, name: value.name, strength: value.strength, purpose: value.purpose,
    doseAmount: value.dose_amount, usageRule: value.usage_rule, warnings: value.warnings ?? "", notes: value.notes,
    labelSource: value.label_source, explanation: value.explanation, explanationOrigin: value.explanation_origin,
  });
}

export class SupabaseDosingMedicineReader implements DosingMedicineReader {
  constructor(private readonly client: AdminClient) {}
  async findActive(householdId: string, medicineId: string): Promise<Result<DosingMedicine | null, DomainError>> {
    if (!UUID.test(medicineId)) return ok(null);
    try {
      const { data, error } = await this.client.from("medicines").select(COLUMNS).eq("household_id", householdId).eq("id", medicineId).eq("active", true).maybeSingle().retry(false);
      return error ? err(databaseUnavailable()) : data ? decode(data) : ok(null);
    } catch { return err(databaseUnavailable()); }
  }
  async listActive(householdId: string): Promise<Result<readonly DosingMedicine[], DomainError>> {
    try {

      const { data, error } = await this.client.from("medicines").select(COLUMNS).eq("household_id", householdId).eq("active", true).order("created_at").retry(false);
      if (error) return err(databaseUnavailable());
      const values: DosingMedicine[] = [];
      for (const row of data) { const parsed = decode(row); if (!parsed.ok) return parsed; values.push(parsed.value); }
      return ok(values);
    } catch { return err(databaseUnavailable()); }
  }
}
