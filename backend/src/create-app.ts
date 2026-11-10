import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Container } from "./composition-root";
import { handleError, handleNotFound } from "./shared/interface/error-handler";
import { healthRoutes } from "./shared/interface/health.routes";

// Nama berkas sengaja bukan app.ts/server.ts: Vercel mendeteksi src/app.ts,
// src/index.ts, dan src/server.ts sebagai entri. Entri tunggal = src/index.ts.
export function createApp(container: Container): Hono {
  const app = new Hono();

  app.use(
    "/v1/*",
    cors({
      origin: container.frontendOrigin,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );

  app.route("/v1", healthRoutes);

  app.notFound(handleNotFound);
  app.onError(handleError);
  return app;
}
