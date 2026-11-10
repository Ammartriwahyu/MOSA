import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import type { Container } from "./composition-root";
import { createErrorHandler, handleNotFound } from "./shared/interface/error-handler";
import { healthRoutes } from "./shared/interface/health.routes";
import { requestLogger } from "./shared/interface/request-logger";

// Nama berkas sengaja bukan app.ts/server.ts: Vercel mendeteksi src/app.ts,
// src/index.ts, dan src/server.ts sebagai entri. Entri tunggal = src/index.ts.
export function createApp(container: Container): Hono {
  const app = new Hono();

  app.use("*", requestId());
  app.use("*", requestLogger(container.logger));
  app.use(
    "/v1/*",
    cors({
      origin: container.frontendOrigin,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );

  app.route("/v1", healthRoutes(container.checkHealth));

  app.notFound(handleNotFound);
  app.onError(createErrorHandler(container.logger));
  return app;
}
