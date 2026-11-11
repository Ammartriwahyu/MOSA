import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { Database } from "../../../shared/infrastructure/database.types";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client";
import type { ExplanationOrigin, LabelSource, Medicine, MedicineDraft } from "../domain/medicine";
import type { MedicineRepository } from "../domain/medicine-repository";

type MedicineRow = Omit<Database["public"]["Tables"]["medicines"]["Row"], "intake_times_started_at">;
// Kolom yang ditulis dari draft; id, household_id, active, created_at diatur terpisah.
type MedicineWrite = Omit<
  Database["public"]["Tables"]["medicines"]["Insert"],
  "id" | "household_id" | "active" | "created_at" | "intake_times_started_at"
>;

const COLUMNS =
  "id, household_id, name, name_normalized, strength, strength_normalized, purpose, dose_amount, usage_rule, warnings, notes, intake_times, label_source, explanation, explanation_origin, active, created_at";

// ID dari URL yang bukan UUID membuat Postgres galat; diperlakukan sama dengan tidak ada.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const databaseUnavailable = (): DomainError =>
  domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi.");
const notFound = (): DomainError => domainError("NOT_FOUND", "Obat tidak ditemukan.");

// Nilai di luar daftar dicegah CHECK database; pemetaan ini hanya mempersempit tipe.
const toLabelSource = (value: string): LabelSource => (value === "keluarga" ? "keluarga" : "apoteker");
const toOrigin = (value: string): ExplanationOrigin =>
  value === "ai_dikonfirmasi" ? "ai_dikonfirmasi" : "teks_pengisi";

function toMedicine(row: MedicineRow): Medicine {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    nameNormalized: row.name_normalized,
    strength: row.strength,
    strengthNormalized: row.strength_normalized,
    purpose: row.purpose,
    doseAmount: row.dose_amount,
    usageRule: row.usage_rule,
    warnings: row.warnings ?? "",
    notes: row.notes,
    intakeTimes: row.intake_times,
    labelSource: toLabelSource(row.label_source),
    explanation: row.explanation,
    explanationOrigin: toOrigin(row.explanation_origin),
    active: row.active,
    createdAt: Date.parse(row.created_at),
  };
}

function toWrite(draft: MedicineDraft): MedicineWrite {
  return {
    name: draft.name,
    name_normalized: draft.nameNormalized,
    strength: draft.strength,
    strength_normalized: draft.strengthNormalized,
    purpose: draft.purpose,
    dose_amount: draft.doseAmount,
    usage_rule: draft.usageRule,
    warnings: draft.warnings,
    notes: draft.notes,
    intake_times: [...draft.intakeTimes],
    label_source: draft.labelSource,
    explanation: draft.explanation,
    explanation_origin: draft.explanationOrigin,
  };
}

/** Setiap query menyertakan household_id dari sesi (docs/03 §11). */
export class SupabaseMedicineRepository implements MedicineRepository {
  constructor(private readonly client: AdminClient) {}

  async findActive(householdId: string, medicineId: string): Promise<Result<Medicine | null, DomainError>> {
    if (!UUID.test(medicineId)) return ok(null);
    try {
      const { data, error } = await this.client
        .from("medicines")
        .select(COLUMNS)
        .eq("id", medicineId)
        .eq("household_id", householdId)
        .eq("active", true)
        .maybeSingle();
      if (error) return err(databaseUnavailable());
      return ok(data ? toMedicine(data) : null);
    } catch {
      return err(databaseUnavailable());
    }
  }

  async listActive(householdId: string): Promise<Result<Medicine[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from("medicines")
        .select(COLUMNS)
        .eq("household_id", householdId)
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) return err(databaseUnavailable());
      return ok(data.map(toMedicine));
    } catch {
      return err(databaseUnavailable());
    }
  }

  async create(householdId: string, draft: MedicineDraft, createdAt: number): Promise<Result<Medicine, DomainError>> {
    try {
      const { data, error } = await this.client
        .from("medicines")
        .insert({
          ...toWrite(draft),
          household_id: householdId,
          created_at: new Date(createdAt).toISOString(),
        })
        .select(COLUMNS)
        .single();
      if (error) return err(databaseUnavailable());
      return ok(toMedicine(data));
    } catch {
      return err(databaseUnavailable());
    }
  }

  async save(medicine: Medicine): Promise<Result<void, DomainError>> {
    try {
      const { data, error } = await this.client
        .from("medicines")
        .update({ ...toWrite(medicine), active: medicine.active })
        .eq("id", medicine.id)
        .eq("household_id", medicine.householdId)
        .select("id");
      if (error) return err(databaseUnavailable());
      return data.length === 1 ? ok(undefined) : err(notFound());
    } catch {
      return err(databaseUnavailable());
    }
  }
}
