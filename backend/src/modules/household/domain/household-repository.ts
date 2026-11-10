import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { Household } from "./household";

// Port repository. Setiap metode dibatasi pada satu rumah tangga milik sesi.
export interface HouseholdRepository {
  findByOwner(ownerUserId: string): Promise<Result<Household | null, DomainError>>;
  findById(householdId: string): Promise<Result<Household | null, DomainError>>;
  /** Membuat rumah tangga kosong bila belum ada. Aman dipanggil bersamaan (tanpa duplikat). */
  createIfAbsent(ownerUserId: string): Promise<Result<void, DomainError>>;
  /** Menyimpan persetujuan dan mode output. NOT_FOUND bila baris tidak ada. */
  saveSettings(household: Household): Promise<Result<void, DomainError>>;
}
