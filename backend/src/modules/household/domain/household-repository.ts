import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { Household } from "./household";

export interface HouseholdRepository {
  findByOwner(ownerUserId: string): Promise<Result<Household | null, DomainError>>;
  findById(householdId: string): Promise<Result<Household | null, DomainError>>;

  createIfAbsent(ownerUserId: string): Promise<Result<void, DomainError>>;

  saveSettings(household: Household): Promise<Result<void, DomainError>>;
}
