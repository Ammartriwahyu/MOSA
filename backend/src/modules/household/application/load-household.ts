import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { Household } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";

export async function loadHousehold(
  households: HouseholdRepository,
  householdId: string,
): Promise<Result<Household, DomainError>> {
  const found = await households.findById(householdId);
  if (!found.ok) return found;
  if (!found.value) return err(domainError("NOT_FOUND", "Rumah tangga tidak ditemukan."));
  return ok(found.value);
}
