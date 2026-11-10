import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client";
import type { AccountEraser } from "../application/ports/account-eraser";

/**
 * Menghapus pengguna Supabase Auth secara permanen (bukan soft delete).
 * Rumah tangga, obat, catatan minum, dan jatah AI ikut terhapus lewat
 * ON DELETE CASCADE dari auth.users. Pengguna yang sudah tidak ada = berhasil.
 */
export class SupabaseAccountEraser implements AccountEraser {
  constructor(private readonly client: AdminClient) {}

  async eraseAccount(ownerUserId: string): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client.auth.admin.deleteUser(ownerUserId, false);
      if (!error || error.status === 404) return ok(undefined);
    } catch {
      // Batas waktu atau jaringan putus.
    }
    return err(domainError("AUTH_UNAVAILABLE", "Layanan akun sedang tidak dapat dihubungi."));
  }
}
