import type { DomainError } from "../../../shared/domain/domain-error";
import { ok, type Result } from "../../../shared/domain/result";
import type { Household } from "../domain/household";
import type { HouseholdRepository } from "../domain/household-repository";

/** Mengambil rumah tangga milik pengguna, membuatnya bila belum ada. Idempoten. */
export class EnsureHousehold {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(input: { userId: string }): Promise<Result<Household, DomainError>> {
    const existing = await this.households.findByOwner(input.userId);
    if (!existing.ok) return existing;
    if (existing.value) return ok(existing.value);

    // Dua permintaan pertama bisa datang bersamaan dari dua HP: createIfAbsent
    // tidak menggandakan, lalu keduanya membaca baris yang sama.
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
