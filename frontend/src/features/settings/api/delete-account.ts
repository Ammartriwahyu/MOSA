import { api } from "@/shared/lib";

/**
 * Hapus seluruh data dan akun (PRD §19 #14). Backend menghapus pengguna Auth;
 * obat, catatan minum, dan rumah tangga ikut terhapus (ON DELETE CASCADE).
 * Akun demo dibalas 403 DEMO_PROTECTED.
 */
export function deleteHouseholdData(signal: AbortSignal): Promise<void> {
  return api().noContent("/v1/household", { method: "DELETE", signal });
}
