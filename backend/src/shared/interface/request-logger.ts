import type { MiddlewareHandler } from "hono";
import { routePath } from "hono/route";
import type { Logger } from "../application/logger";
import { requestMethod } from "./request-method";

/** Satu baris log per permintaan: metode, pola rute, status, durasi, requestId. */
export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = performance.now();
    await next();
    logger.info({
      event: "http_request",
      requestId: c.get("requestId"),
      method: requestMethod(c.req.method),
      route: routePath(c, -1),
      status: c.res.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
  };
}
