import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";
import type { PackageImage } from "../../domain/package-image";
import type { PackageReading } from "../../domain/package-reading";

/** Hanya pembacaan kemasan. Tidak menerima household, daftar obat, jadwal atau slot. */
export interface PackageReader {
  read(image: PackageImage): Promise<Result<PackageReading, DomainError>>;
}
