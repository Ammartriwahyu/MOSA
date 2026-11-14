import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import type { Container } from "./composition-root.js";
import { dosingRoutes } from "./modules/dosing/interface/dosing.routes.js";
import { householdRoutes } from "./modules/household/interface/household.routes.js";
import { resolveHousehold } from "./modules/household/interface/resolve-household.middleware.js";
import { medicationRoutes } from "./modules/medication/interface/medication.routes.js";
import { scanRoutes } from "./modules/verification/interface/scan.routes.js";
import { notificationRoutes, reminderCronRoutes } from "./modules/notification/interface/notification.routes.js";
import { authenticate } from "./shared/interface/authenticate.middleware.js";
import { createErrorHandler, handleNotFound } from "./shared/interface/error-handler.js";
import { healthRoutes } from "./shared/interface/health.routes.js";
import { requestLogger } from "./shared/interface/request-logger.js";
import { requireDataConsent } from "./shared/interface/require-data-consent.middleware.js";

export function createApp(container: Container): Hono {
  const app = new Hono();

  app.use("*", requestId({ headerName: "" }));
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Request-Id", c.get("requestId"));
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
  });
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

  app.route("/v1", reminderCronRoutes(container.notification, container.cronSecret));
  app.use("/v1/*", authenticate(container.tokenVerifier));
  app.use("/v1/*", resolveHousehold(container.ensureHousehold));
  app.use("/v1/*", requireDataConsent());

  app.route("/v1", healthRoutes(container.checkHealth));
  app.route("/v1", householdRoutes(container.household));
  app.route("/v1", medicationRoutes(container.medication));
  app.route("/v1", dosingRoutes(container.dosing));
  app.route("/v1", scanRoutes(container.scan));
  app.route("/v1", notificationRoutes(container.notification));

  app.notFound(handleNotFound);
  app.onError(createErrorHandler(container.logger));
  return app;
}
