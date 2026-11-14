import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import type { Container } from "./composition-root";
import { dosingRoutes } from "./modules/dosing/interface/dosing.routes";
import { householdRoutes } from "./modules/household/interface/household.routes";
import { resolveHousehold } from "./modules/household/interface/resolve-household.middleware";
import { medicationRoutes } from "./modules/medication/interface/medication.routes";
import { scanRoutes } from "./modules/verification/interface/scan.routes";
import { notificationRoutes, reminderCronRoutes } from "./modules/notification/interface/notification.routes";
import { authenticate } from "./shared/interface/authenticate.middleware";
import { createErrorHandler, handleNotFound } from "./shared/interface/error-handler";
import { healthRoutes } from "./shared/interface/health.routes";
import { requestLogger } from "./shared/interface/request-logger";
import { requireDataConsent } from "./shared/interface/require-data-consent.middleware";

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
