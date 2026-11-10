import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";

// Port: menghapus akun login beserta seluruh data rumah tangganya.
// Implementasi Supabase menghapus pengguna Auth; data ikut terhapus lewat
// ON DELETE CASCADE dari auth.users (migrasi awal), jadi satu operasi atomik.
export interface AccountEraser {
  eraseAccount(ownerUserId: string): Promise<Result<void, DomainError>>;
}
