import type { Household } from "../../src/modules/household/domain/household";
import type { HouseholdRepository } from "../../src/modules/household/domain/household-repository";
import type { DomainError } from "../../src/shared/domain/domain-error";
import { ok, type Result } from "../../src/shared/domain/result";

/** Repository palsu untuk tes application/interface. Data seluruhnya fiktif. */
export class InMemoryHouseholdRepository implements HouseholdRepository {
  readonly rows = new Map<string, Household>();
  private sequence = 0;

  constructor(seed: Household[] = []) {
    for (const household of seed) this.rows.set(household.ownerUserId, household);
  }

  async findByOwner(ownerUserId: string): Promise<Result<Household | null, DomainError>> {
    return ok(this.rows.get(ownerUserId) ?? null);
  }

  async createIfAbsent(ownerUserId: string): Promise<Result<void, DomainError>> {
    if (!this.rows.has(ownerUserId)) {
      this.sequence += 1;
      this.rows.set(ownerUserId, {
        id: `rumah-${this.sequence}`,
        ownerUserId,
        dataConsentAt: null,
        scanConsentAt: null,
        outputMode: null,
        isDemo: false,
        createdAt: 0,
      });
    }
    return ok(undefined);
  }
}

export function householdFixture(overrides: Partial<Household> & Pick<Household, "id" | "ownerUserId">): Household {
  return {
    dataConsentAt: null,
    scanConsentAt: null,
    outputMode: null,
    isDemo: false,
    createdAt: 0,
    ...overrides,
  };
}
