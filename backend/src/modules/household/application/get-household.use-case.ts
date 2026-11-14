import type { DomainError } from "../../../shared/domain/domain-error.js";
import type { Result } from "../../../shared/domain/result.js";
import type { Household } from "../domain/household.js";
import type { HouseholdRepository } from "../domain/household-repository.js";
import { loadHousehold } from "./load-household.js";

export class GetHousehold {
  constructor(private readonly households: HouseholdRepository) {}

  execute(input: { householdId: string }): Promise<Result<Household, DomainError>> {
    return loadHousehold(this.households, input.householdId);
  }
}
