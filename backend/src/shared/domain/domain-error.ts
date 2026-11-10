// Kode galat terstandar (docs/03 §9). Pemetaan ke status HTTP hanya di
// shared/interface/error-handler.ts. Frontend merakit kalimat dari kode,
// jadi `message` hanya cadangan untuk pengembang, bukan kalimat baku.
export const DOMAIN_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "CONSENT_REQUIRED",
  "DEMO_PROTECTED",
  "NOT_FOUND",
  "DOSE_NOT_DUE",
  "DOSE_MISSED",
  "DOSE_ALREADY_CONFIRMED",
  "SCAN_TOKEN_INVALID",
  "PHOTO_UNREADABLE",
  "AI_QUOTA_EXCEEDED",
  "AI_UNAVAILABLE",
  // Tambahan di luar tabel docs/03 §9: layanan pendukung tidak terjangkau.
  "DATABASE_UNAVAILABLE",
  "AUTH_UNAVAILABLE",
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

// Hanya data terstruktur yang aman ditampilkan (mis. nama kolom yang salah),
// tidak pernah teks bebas dari pengguna.
export type DomainErrorDetails = Readonly<Record<string, unknown>> | null;

export type DomainError = {
  readonly code: DomainErrorCode;
  readonly message: string;
  readonly details: DomainErrorDetails;
};

export function domainError(
  code: DomainErrorCode,
  message: string,
  details: DomainErrorDetails = null,
): DomainError {
  return { code, message, details };
}
