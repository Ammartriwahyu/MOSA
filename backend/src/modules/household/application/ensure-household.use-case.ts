import type { DomainError } from "../../../shared/domain/domain-error.js";
import { ok, type Result } from "../../../shared/domain/result.js";
import type { Household } from "../domain/household.js";
import type { HouseholdRepository } from "../domain/household-repository.js";

export class EnsureHousehold {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(input: { userId: string }): Promise<Result<Household, DomainError>> {
    const existing = await this.households.findByOwner(input.userId);
    if (!existing.ok) return existing;
    if (existing.value) return ok(existing.value);

    const created = await this.households.createIfAbsent(input.userId);
    if (!created.ok) return created;

    const reloaded = await this.households.findByOwner(input.userId);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) {
      throw new Error("Rumah tangga tidak ditemukan tepat setelah dibuat.");
    }
    return ok(reloaded.value);
  }
}
