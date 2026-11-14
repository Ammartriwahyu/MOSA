import { Hono } from "hono";
import type { CheckHealth } from "../application/check-health.use-case.js";
import { domainErrorResponse } from "./error-handler.js";

export function healthRoutes(checkHealth: CheckHealth): Hono {
  return new Hono().get("/health", async (c) => {
    const result = await checkHealth.execute();
    if (!result.ok) return domainErrorResponse(c, result.error);
    return c.json({ status: "ok" });
  });
}
