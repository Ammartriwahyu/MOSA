import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { normalizeMedicineName } from "../../../shared/domain/medicine-name-normalizer.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import { parseStrength, type Strength } from "../../../shared/domain/strength.js";
import type { PackageReading, RegisteredMedicine } from "./package-reading.js";

export type PackageMismatch =
  | { readonly outcome: "tidak_terbaca" }
  | { readonly outcome: "tidak_terdaftar" }
  | { readonly outcome: "kekuatan_tidak_terbaca"; readonly medicines: readonly RegisteredMedicine[] }
  | { readonly outcome: "kekuatan_beda"; readonly medicines: readonly RegisteredMedicine[]; readonly readStrength: Strength };

export type PackageMatch = PackageMismatch | {
  readonly outcome: "cocok";
  readonly medicine: RegisteredMedicine;
  readonly readStrength: Strength;
};

export function matchPackage(
  reading: PackageReading,
  registered: readonly RegisteredMedicine[],
): Result<PackageMatch, DomainError> {
  if (!reading.legible) return ok({ outcome: "tidak_terbaca" });
  const names = new Set(reading.names.map(normalizeMedicineName).filter(Boolean));
  if (names.size === 0) return ok({ outcome: "tidak_terbaca" });
  const candidates = registered.filter((medicine) => names.has(normalizeMedicineName(medicine.name)));

  if (candidates.length === 0) return ok({ outcome: "tidak_terdaftar" });

  const readStrength = reading.strength === null ? null : parseStrength(reading.strength);
  if (readStrength === null) return ok({ outcome: "kekuatan_tidak_terbaca", medicines: candidates });

  const matches = candidates.filter((medicine) => parseStrength(medicine.strength)?.normalized === readStrength.normalized);
  if (matches.length === 0) return ok({ outcome: "kekuatan_beda", medicines: candidates, readStrength });
  const [medicine] = matches;
  if (matches.length !== 1 || !medicine) {

    return err(domainError("VALIDATION_FAILED", "Identitas obat perlu diperjelas.", { field: "medicineId", reason: "ambiguous_match" }));
  }
  return ok({ outcome: "cocok", medicine, readStrength });
}
