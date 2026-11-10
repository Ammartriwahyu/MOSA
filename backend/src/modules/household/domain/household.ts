import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";

// Rumah tangga (aggregate root, docs/03 §6.1). Satu pengguna Supabase punya
// tepat satu rumah tangga, dibuat otomatis saat permintaan terautentikasi pertama.
export type OutputMode = "teks" | "suara";
export type ConsentKind = "data" | "scan";

export type Household = {
  readonly id: string;
  readonly ownerUserId: string;
  /** Epoch ms; null = belum menyetujui penyimpanan data. */
  readonly dataConsentAt: number | null;
  /** Epoch ms; null = belum menyetujui scan pertama. */
  readonly scanConsentAt: number | null;
  /** null = belum memilih Teks atau Suara. */
  readonly outputMode: OutputMode | null;
  /** Akun Demo Juri: tidak boleh dihapus. */
  readonly isDemo: boolean;
  readonly createdAt: number;
};

export function hasDataConsent(household: Household): boolean {
  return household.dataConsentAt !== null;
}

const consentRequired = (): DomainError =>
  domainError("CONSENT_REQUIRED", "Persetujuan penyimpanan data belum dicatat.");

/**
 * Mencatat persetujuan. Idempoten: waktu persetujuan pertama dipertahankan.
 * Persetujuan scan baru boleh dicatat setelah persetujuan data (data akun
 * belum boleh disimpan sebelum itu).
 */
export function recordConsent(
  household: Household,
  kind: ConsentKind,
  at: number,
): Result<Household, DomainError> {
  if (kind === "data") {
    return ok({ ...household, dataConsentAt: household.dataConsentAt ?? at });
  }
  if (!hasDataConsent(household)) return err(consentRequired());
  return ok({ ...household, scanConsentAt: household.scanConsentAt ?? at });
}

/** Mengganti mode output Teks/Suara (MVP-06). Butuh persetujuan data. */
export function changeOutputMode(
  household: Household,
  outputMode: OutputMode,
): Result<Household, DomainError> {
  if (!hasDataConsent(household)) return err(consentRequired());
  return ok({ ...household, outputMode });
}

/** Akun Demo Juri dilindungi dari penghapusan (PRD §19 #14). */
export function ensureDeletable(household: Household): Result<void, DomainError> {
  if (household.isDemo) {
    return err(domainError("DEMO_PROTECTED", "Akun demo tidak dapat dihapus."));
  }
  return ok(undefined);
}
