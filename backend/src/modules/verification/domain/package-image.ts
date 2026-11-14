import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";

export const PACKAGE_IMAGE_LIMITS = Object.freeze({ maxBytes: 1_500_000 });
export const PACKAGE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PackageImageMimeType = (typeof PACKAGE_IMAGE_MIME_TYPES)[number];

export type PackageImage = {
  readonly bytes: Uint8Array;
  readonly mimeType: PackageImageMimeType;
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[index + offset] === value);
}

function hasSignature(bytes: Uint8Array, mimeType: PackageImageMimeType): boolean {
  switch (mimeType) {
    case "image/jpeg": return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png": return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp": return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
}

export function createPackageImage(input: {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}): Result<PackageImage, DomainError> {
  const invalid = (field: string) => err(domainError("VALIDATION_FAILED", "Gambar kemasan tidak valid.", { field }));
  const mimeType = PACKAGE_IMAGE_MIME_TYPES.find((allowed) => allowed === input.mimeType);
  if (!mimeType) return invalid("mimeType");
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > PACKAGE_IMAGE_LIMITS.maxBytes) return invalid("image");
  if (!hasSignature(input.bytes, mimeType)) return invalid("image");
  return ok({ bytes: input.bytes, mimeType });
}
