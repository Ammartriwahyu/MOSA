import type { Clock } from "../../../shared/domain/clock";
import type { DomainError } from "../../../shared/domain/domain-error";
import { ok, type Result } from "../../../shared/domain/result";
import { recordConsent, type ConsentKind, type Household } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";
import { loadHousehold } from "./load-household";

/** Mencatat persetujuan 'data' (saat daftar) atau 'scan' (sebelum scan pertama). */
export class RecordConsent {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    householdId: string;
    kind: ConsentKind;
  }): Promise<Result<Household, DomainError>> {
    const loaded = await loadHousehold(this.households, input.householdId);
    if (!loaded.ok) return loaded;

    const updated = recordConsent(loaded.value, input.kind, this.clock.now());
    if (!updated.ok) return updated;

    const saved = await this.households.saveSettings(updated.value);
    if (!saved.ok) return saved;
    return ok(updated.value);
  }
}
