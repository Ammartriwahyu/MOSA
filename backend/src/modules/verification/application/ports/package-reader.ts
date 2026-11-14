import type { DomainError } from "../../../../shared/domain/domain-error.js";
import type { Result } from "../../../../shared/domain/result.js";
import type { PackageImage } from "../../domain/package-image.js";
import type { PackageReading } from "../../domain/package-reading.js";

export interface PackageReader {
  read(image: PackageImage): Promise<Result<PackageReading, DomainError>>;
}
