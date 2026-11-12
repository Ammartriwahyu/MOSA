import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { normalizeMedicineName } from "../../../shared/domain/medicine-name-normalizer";
import { err, ok, type Result } from "../../../shared/domain/result";
import { parseStrength, type Strength } from "../../../shared/domain/strength";
import type { PackageReading, RegisteredMedicine } from "./package-reading";

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

/** Urutan docs/01 §5: keterbacaan → nama → kekuatan. Tidak memakai kemiripan/sinonim tebakan. */
export function matchPackage(
  reading: PackageReading,
  registered: readonly RegisteredMedicine[],
): Result<PackageMatch, DomainError> {
  if (!reading.legible) return ok({ outcome: "tidak_terbaca" });
  const names = new Set(reading.names.map(normalizeMedicineName).filter(Boolean));
  if (names.size === 0) return ok({ outcome: "tidak_terbaca" });
  const candidates = registered.filter((medicine) => names.has(normalizeMedicineName(medicine.name)));
  // Nama tebakan dari AI tidak ikut keluar pada hasil tidak terdaftar.
  if (candidates.length === 0) return ok({ outcome: "tidak_terdaftar" });

  const readStrength = reading.strength === null ? null : parseStrength(reading.strength);
  if (readStrength === null) return ok({ outcome: "kekuatan_tidak_terbaca", medicines: candidates });

  const matches = candidates.filter((medicine) => parseStrength(medicine.strength)?.normalized === readStrength.normalized);
  if (matches.length === 0) return ok({ outcome: "kekuatan_beda", medicines: candidates, readStrength });
  const [medicine] = matches;
  if (matches.length !== 1 || !medicine) {
    // Dua identitas terdaftar cocok: jangan memilih dari urutan repository atau jadwal.
    return err(domainError("VALIDATION_FAILED", "Identitas obat perlu diperjelas.", { field: "medicineId", reason: "ambiguous_match" }));
  }
  return ok({ outcome: "cocok", medicine, readStrength });
}
