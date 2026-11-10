import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { Database } from "../../../shared/infrastructure/database.types";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client";
import type { Household, OutputMode } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";

type HouseholdRow = Database["public"]["Tables"]["households"]["Row"];

const COLUMNS =
  "id, owner_user_id, data_consent_at, scan_consent_at, output_mode, is_demo, created_at";

const databaseUnavailable = (): DomainError =>
  domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi.");

function toOutputMode(value: string | null): OutputMode | null {
  return value === "teks" || value === "suara" ? value : null;
}

const toEpoch = (value: string | null): number | null => (value === null ? null : Date.parse(value));
const toIso = (value: number | null): string | null =>
  value === null ? null : new Date(value).toISOString();

function toHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    dataConsentAt: toEpoch(row.data_consent_at),
    scanConsentAt: toEpoch(row.scan_consent_at),
    outputMode: toOutputMode(row.output_mode),
    isDemo: row.is_demo,
    createdAt: Date.parse(row.created_at),
  };
}

export class SupabaseHouseholdRepository implements HouseholdRepository {
  constructor(private readonly client: AdminClient) {}

  async findByOwner(ownerUserId: string): Promise<Result<Household | null, DomainError>> {
    try {
      const { data, error } = await this.client
        .from("households")
        .select(COLUMNS)
        .eq("owner_user_id", ownerUserId)
        .maybeSingle();
      if (error) return err(databaseUnavailable());
      return ok(data ? toHousehold(data) : null);
    } catch {
      return err(databaseUnavailable());
    }
  }

  async findById(householdId: string): Promise<Result<Household | null, DomainError>> {
    try {
      const { data, error } = await this.client
        .from("households")
        .select(COLUMNS)
        .eq("id", householdId)
        .maybeSingle();
      if (error) return err(databaseUnavailable());
      return ok(data ? toHousehold(data) : null);
    } catch {
      return err(databaseUnavailable());
    }
  }

  async saveSettings(household: Household): Promise<Result<void, DomainError>> {
    try {
      // Hanya kolom pengaturan; is_demo dan pemilik tidak pernah diubah dari aplikasi.
      const { data, error } = await this.client
        .from("households")
        .update({
          data_consent_at: toIso(household.dataConsentAt),
          scan_consent_at: toIso(household.scanConsentAt),
          output_mode: household.outputMode,
        })
        .eq("id", household.id)
        .eq("owner_user_id", household.ownerUserId)
        .select("id");
      if (error) return err(databaseUnavailable());
      if (data.length === 0) return err(domainError("NOT_FOUND", "Rumah tangga tidak ditemukan."));
      return ok(undefined);
    } catch {
      return err(databaseUnavailable());
    }
  }

  async createIfAbsent(ownerUserId: string): Promise<Result<void, DomainError>> {
    try {
      // ON CONFLICT DO NOTHING pada owner_user_id (unik): aman untuk permintaan bersamaan.
      const { error } = await this.client
        .from("households")
        .upsert({ owner_user_id: ownerUserId }, { onConflict: "owner_user_id", ignoreDuplicates: true });
      if (error) return err(databaseUnavailable());
      return ok(undefined);
    } catch {
      return err(databaseUnavailable());
    }
  }
}
