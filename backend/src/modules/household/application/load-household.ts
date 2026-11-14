import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import type { Household } from "../domain/household.js";
import type { HouseholdRepository } from "../domain/household-repository.js";

export async function loadHousehold(
  households: HouseholdRepository,
  householdId: string,
): Promise<Result<Household, DomainError>> {
  const found = await households.findById(householdId);
  if (!found.ok) return found;
  if (!found.value) return err(domainError("NOT_FOUND", "Rumah tangga tidak ditemukan."));
  return ok(found.value);
}
