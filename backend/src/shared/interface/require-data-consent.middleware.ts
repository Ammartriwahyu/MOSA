import type { MiddlewareHandler } from "hono";
import { domainError } from "../domain/domain-error";
import { domainErrorResponse } from "./error-handler";
import { isConsentExempt } from "./session";

/**
 * Semua rute selain /v1/household* dan /v1/health membalas 403 CONSENT_REQUIRED
 * selama persetujuan penyimpanan data belum dicatat (docs/03 §6.1).
 * Bila nilai persetujuan tidak ada di konteks, dianggap belum setuju.
 */
export function requireDataConsent(): MiddlewareHandler {
  return async (c, next) => {
    if (isConsentExempt(c.req.path)) return next();
    if (c.get("hasDataConsent") !== true) {
      return domainErrorResponse(
        c,
        domainError("CONSENT_REQUIRED", "Persetujuan penyimpanan data belum dicatat."),
      );
    }
    await next();
  };
}
