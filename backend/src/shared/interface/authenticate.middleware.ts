import type { MiddlewareHandler } from "hono";
import type { AccessTokenVerifier } from "../application/access-token-verifier";
import { domainError } from "../domain/domain-error";
import { domainErrorResponse } from "./error-handler";
import { isPublicPath } from "./session";

const BEARER = /^Bearer\s+(\S+)$/i;

export function authenticate(verifier: AccessTokenVerifier): MiddlewareHandler {
  return async (c, next) => {
    if (isPublicPath(c.req.path)) return next();

    const token = BEARER.exec(c.req.header("Authorization") ?? "")?.[1];
    if (!token) {
      return domainErrorResponse(c, domainError("UNAUTHENTICATED", "Silakan masuk terlebih dahulu."));
    }

    const verified = await verifier.verify(token);
    if (!verified.ok) return domainErrorResponse(c, verified.error);

    c.set("userId", verified.value.userId);
    await next();
  };
}
