import type { MiddlewareHandler } from "hono";
import { domainErrorResponse } from "../../../shared/interface/error-handler.js";
import { isPublicPath } from "../../../shared/interface/session.js";
import type { EnsureHousehold } from "../application/ensure-household.use-case.js";
import { hasDataConsent } from "../domain/household.js";

export function resolveHousehold(ensureHousehold: EnsureHousehold): MiddlewareHandler {
  return async (c, next) => {
    if (isPublicPath(c.req.path)) return next();

    const userId = c.get("userId");
    if (!userId) throw new Error("resolveHousehold dipasang sebelum authenticate.");

    const household = await ensureHousehold.execute({ userId });
    if (!household.ok) return domainErrorResponse(c, household.error);

    c.set("householdId", household.value.id);
    c.set("hasDataConsent", hasDataConsent(household.value));
    await next();
  };
}
