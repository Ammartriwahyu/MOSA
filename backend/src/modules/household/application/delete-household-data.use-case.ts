import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import { ensureDeletable } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";
import { loadHousehold } from "./load-household";
import type { AccountEraser } from "./ports/account-eraser";

export class DeleteHouseholdData {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly eraser: AccountEraser,
  ) {}

  async execute(input: { householdId: string }): Promise<Result<void, DomainError>> {
    const loaded = await loadHousehold(this.households, input.householdId);
    if (!loaded.ok) return loaded;

    const deletable = ensureDeletable(loaded.value);
    if (!deletable.ok) return deletable;

    return this.eraser.eraseAccount(loaded.value.ownerUserId);
  }
}
