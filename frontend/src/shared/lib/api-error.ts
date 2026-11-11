/** Kode galat dari backend (docs/03 §9 + tambahan) dan dari sisi klien. */
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "CONSENT_REQUIRED"
  | "DEMO_PROTECTED"
  | "NOT_FOUND"
  | "DOSE_NOT_DUE"
  | "DOSE_MISSED"
  | "DOSE_ALREADY_CONFIRMED"
  | "SCAN_TOKEN_INVALID"
  | "PHOTO_UNREADABLE"
  | "AI_QUOTA_EXCEEDED"
  | "AI_UNAVAILABLE"
  | "DATABASE_UNAVAILABLE"
  | "AUTH_UNAVAILABLE"
  | "INTERNAL_ERROR"
  // Sisi klien:
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "UNKNOWN_ERROR";

/**
 * Galat terstruktur dari api-client. Komponen menentukan kalimat dari `code`
 * lewat shared/copy, bukan dari `message` (pesan backend untuk pengembang).
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | (string & {}),
    readonly status: number | null,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
