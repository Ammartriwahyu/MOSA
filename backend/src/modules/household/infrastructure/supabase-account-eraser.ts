import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import type { AdminClient } from "../../../shared/infrastructure/supabase-client.js";
import type { AccountEraser } from "../application/ports/account-eraser.js";

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
