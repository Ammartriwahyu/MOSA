import type { MiddlewareHandler } from "hono";
import { domainError } from "../domain/domain-error.js";
import { domainErrorResponse } from "./error-handler.js";
import { isConsentExempt } from "./session.js";

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
