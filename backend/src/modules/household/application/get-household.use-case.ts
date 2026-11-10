import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { Household } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";
import { loadHousehold } from "./load-household";

export class GetHousehold {
  constructor(private readonly households: HouseholdRepository) {}

  execute(input: { householdId: string }): Promise<Result<Household, DomainError>> {
    return loadHousehold(this.households, input.householdId);
  }
}
