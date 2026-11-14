import type { DomainError } from "../../../shared/domain/domain-error.js";
import type { Result } from "../../../shared/domain/result.js";
import { ensureDeletable } from "../domain/household.js";
import type { HouseholdRepository } from "../domain/household-repository.js";
import { loadHousehold } from "./load-household.js";
import type { AccountEraser } from "./ports/account-eraser.js";

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
