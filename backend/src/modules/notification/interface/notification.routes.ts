import { createHash, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { domainError } from "../../../shared/domain/domain-error";
import { domainErrorResponse } from "../../../shared/interface/error-handler";
import { parseJsonBody } from "../../../shared/interface/parse-json-body";
import { sessionOf } from "../../../shared/interface/session";
import type { SendDueReminders } from "../application/send-due-reminders.use-case";
import type { SubscribePush, UnsubscribePush } from "../application/subscription.use-cases";

export type NotificationUseCases = { subscribePush: SubscribePush; unsubscribePush: UnsubscribePush; sendDueReminders: SendDueReminders };
const unavailable = () => domainError("PUSH_UNAVAILABLE", "Pengingat push belum tersedia.");
const endpointSchema = z.string().min(1).max(4096);
const registrationSchema = z.object({ endpoint: endpointSchema,
  keys: z.object({ p256dh: z.string().max(100), auth: z.string().max(30) }).strict(),
  expirationTime: z.number().nullable().optional(),
}).strict();

export function notificationRoutes(useCases: NotificationUseCases | undefined): Hono {
  return new Hono().use("/push/*", bodyLimit({ maxSize: 8192, onError: (c) =>
    domainErrorResponse(c, domainError("VALIDATION_FAILED", "Permintaan terlalu besar.")) }))
    .post("/push/subscriptions", async (c) => {
      if (!useCases) return domainErrorResponse(c, unavailable());
      const body = await parseJsonBody(c, registrationSchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.subscribePush.execute({ householdId: sessionOf(c).householdId, subscription: body.value });
      return result.ok ? c.body(null, 204) : domainErrorResponse(c, result.error);
    }).delete("/push/subscriptions", async (c) => {
      if (!useCases) return domainErrorResponse(c, unavailable());
      const body = await parseJsonBody(c, z.object({ endpoint: endpointSchema }).strict());
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.unsubscribePush.execute({ householdId: sessionOf(c).householdId, endpoint: body.value.endpoint });
      return result.ok ? c.body(null, 204) : domainErrorResponse(c, result.error);
    });
}

/** Dipasang sebelum middleware sesi, hanya POST pada path persis ini. */
export function reminderCronRoutes(useCases: NotificationUseCases | undefined, secret: string | undefined): Hono {
  return new Hono().post("/internal/reminders/run", async (c) => {
    if (!useCases || !secret) return domainErrorResponse(c, unavailable());
    const supplied = c.req.header("x-cron-secret") ?? "";
    const digest = (value: string) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(digest(secret), digest(supplied))) {
      return domainErrorResponse(c, domainError("UNAUTHENTICATED", "Akses internal ditolak."));
    }
    const result = await useCases.sendDueReminders.execute();
    return result.ok ? c.json(result.value) : domainErrorResponse(c, result.error);
  });
}
