import type { AccountEraser } from "../../src/modules/household/application/ports/account-eraser";
import type { Household } from "../../src/modules/household/domain/household";
import type { HouseholdRepository } from "../../src/modules/household/domain/household-repository";
import { domainError, type DomainError } from "../../src/shared/domain/domain-error";
import { err, ok, type Result } from "../../src/shared/domain/result";

/** Repository palsu untuk tes application/interface. Data seluruhnya fiktif. */
export class InMemoryHouseholdRepository implements HouseholdRepository {
  /** Kunci: ownerUserId. */
  readonly rows = new Map<string, Household>();
  private sequence = 0;

  constructor(seed: Household[] = []) {
    for (const household of seed) this.rows.set(household.ownerUserId, household);
  }

  async findByOwner(ownerUserId: string): Promise<Result<Household | null, DomainError>> {
    return ok(this.rows.get(ownerUserId) ?? null);
  }

  async findById(householdId: string): Promise<Result<Household | null, DomainError>> {
    return ok([...this.rows.values()].find((h) => h.id === householdId) ?? null);
  }

  async createIfAbsent(ownerUserId: string): Promise<Result<void, DomainError>> {
    if (!this.rows.has(ownerUserId)) {
      this.sequence += 1;
      this.rows.set(
        ownerUserId,
        householdFixture({ id: `rumah-${this.sequence}`, ownerUserId }),
      );
    }
    return ok(undefined);
  }

  async saveSettings(household: Household): Promise<Result<void, DomainError>> {
    const current = this.rows.get(household.ownerUserId);
    if (!current || current.id !== household.id) {
      return err(domainError("NOT_FOUND", "Rumah tangga tidak ditemukan."));
    }
    // Hanya kolom pengaturan yang boleh berubah, sama seperti repository Supabase.
    this.rows.set(household.ownerUserId, {
      ...current,
      dataConsentAt: household.dataConsentAt,
      scanConsentAt: household.scanConsentAt,
      outputMode: household.outputMode,
    });
    return ok(undefined);
  }
}

/** Penghapus akun palsu: menghapus baris rumah tangga, meniru ON DELETE CASCADE. */
export class InMemoryAccountEraser implements AccountEraser {
  readonly erased: string[] = [];

  constructor(private readonly households: InMemoryHouseholdRepository) {}

  async eraseAccount(ownerUserId: string): Promise<Result<void, DomainError>> {
    this.erased.push(ownerUserId);
    this.households.rows.delete(ownerUserId);
    return ok(undefined);
  }
}

export function householdFixture(
  overrides: Partial<Household> & Pick<Household, "id" | "ownerUserId">,
): Household {
  return {
    dataConsentAt: null,
    scanConsentAt: null,
    outputMode: null,
    isDemo: false,
    createdAt: 0,
    ...overrides,
  };
}
