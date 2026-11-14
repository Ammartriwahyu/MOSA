import type { DomainError } from "../../../shared/domain/domain-error";
import { ok, type Result } from "../../../shared/domain/result";
import { changeOutputMode, type Household, type OutputMode } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";
import { loadHousehold } from "./load-household";

export class UpdatePreferences {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(input: {
    householdId: string;
    outputMode: OutputMode;
  }): Promise<Result<Household, DomainError>> {
    const loaded = await loadHousehold(this.households, input.householdId);
    if (!loaded.ok) return loaded;

    const updated = changeOutputMode(loaded.value, input.outputMode);
    if (!updated.ok) return updated;

    const saved = await this.households.saveSettings(updated.value);
    if (!saved.ok) return saved;
    return ok(updated.value);
  }
}
