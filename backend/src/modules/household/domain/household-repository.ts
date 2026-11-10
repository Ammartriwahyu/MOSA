import type { DomainError } from "../../../shared/domain/domain-error";
import type { Result } from "../../../shared/domain/result";
import type { Household } from "./household";

// Port repository. Setiap metode menyaring dengan pemilik (pengguna dari sesi).
export interface HouseholdRepository {
  findByOwner(ownerUserId: string): Promise<Result<Household | null, DomainError>>;
  /** Membuat rumah tangga kosong bila belum ada. Aman dipanggil bersamaan (tanpa duplikat). */
  createIfAbsent(ownerUserId: string): Promise<Result<void, DomainError>>;
}
