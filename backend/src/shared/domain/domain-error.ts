
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

  "DATABASE_UNAVAILABLE",
  "AUTH_UNAVAILABLE",
  "PUSH_UNAVAILABLE",
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

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
