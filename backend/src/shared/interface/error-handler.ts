import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { routePath } from "hono/route";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Logger } from "../application/logger.js";
import type { DomainError, DomainErrorCode, DomainErrorDetails } from "../domain/domain-error.js";
import { requestMethod } from "./request-method.js";

export type ErrorBody = {
  error: { code: string; message: string; details: DomainErrorDetails };
};

export function errorBody(
  code: string,
  message: string,
  details: DomainErrorDetails = null,
): ErrorBody {
  return { error: { code, message, details } };
}

export const DOMAIN_ERROR_STATUS: Record<DomainErrorCode, ContentfulStatusCode> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  CONSENT_REQUIRED: 403,
  DEMO_PROTECTED: 403,
  SCAN_TOKEN_INVALID: 403,
  NOT_FOUND: 404,
  DOSE_NOT_DUE: 409,
  DOSE_MISSED: 409,
  DOSE_ALREADY_CONFIRMED: 409,
  PHOTO_UNREADABLE: 422,
  AI_QUOTA_EXCEEDED: 429,
  AI_UNAVAILABLE: 503,
  DATABASE_UNAVAILABLE: 503,
  AUTH_UNAVAILABLE: 503,
  PUSH_UNAVAILABLE: 503,
};

export function domainErrorResponse(c: Context, error: DomainError): Response {
  return c.json(
    errorBody(error.code, error.message, error.details),
    DOMAIN_ERROR_STATUS[error.code],
  );
}

const HTTP_EXCEPTION_CODES: Partial<Record<number, DomainErrorCode>> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  404: "NOT_FOUND",
};

export const handleNotFound: NotFoundHandler = (c) =>
  c.json(errorBody("NOT_FOUND", "Alamat tidak ditemukan."), 404);

export function createErrorHandler(logger: Logger): ErrorHandler {
  return (error, c) => {
    if (error instanceof HTTPException) {
      const status = error.status as ContentfulStatusCode;
      const code = HTTP_EXCEPTION_CODES[status] ?? "INTERNAL_ERROR";
      return c.json(errorBody(code, "Permintaan tidak dapat diproses."), status);
    }

    logger.error({
      event: "unexpected_error",
      code: "INTERNAL_ERROR",
      requestId: c.get("requestId"),
      method: requestMethod(c.req.method),
      route: routePath(c, -1),
    });
    return c.json(errorBody("INTERNAL_ERROR", "Terjadi kesalahan di server."), 500);
  };
}
