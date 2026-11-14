import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";

export type OutputMode = "teks" | "suara";
export type ConsentKind = "data" | "scan";

export type Household = {
  readonly id: string;
  readonly ownerUserId: string;

  readonly dataConsentAt: number | null;

  readonly scanConsentAt: number | null;

  readonly outputMode: OutputMode | null;

  readonly isDemo: boolean;
  readonly createdAt: number;
};

export function hasDataConsent(household: Household): boolean {
  return household.dataConsentAt !== null;
}

const consentRequired = (): DomainError =>
  domainError("CONSENT_REQUIRED", "Persetujuan penyimpanan data belum dicatat.");

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

export function changeOutputMode(
  household: Household,
  outputMode: OutputMode,
): Result<Household, DomainError> {
  if (!hasDataConsent(household)) return err(consentRequired());
  return ok({ ...household, outputMode });
}

export function ensureDeletable(household: Household): Result<void, DomainError> {
  if (household.isDemo) {
    return err(domainError("DEMO_PROTECTED", "Akun demo tidak dapat dihapus."));
  }
  return ok(undefined);
}
