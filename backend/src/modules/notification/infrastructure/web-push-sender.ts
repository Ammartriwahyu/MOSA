import * as webpush from "web-push";
import { validPushEndpoint, type PushSubscription } from "../domain/push-subscription";
import type { PushSender, ReminderPayload } from "../application/ports";

export type PushTransport = typeof webpush.sendNotification;
export class WebPushSender implements PushSender {
  constructor(private readonly vapid: { subject: string; publicKey: string; privateKey: string },
    private readonly transport: PushTransport = (subscription, payload, options) => webpush.sendNotification(subscription, payload, options)) {}

  async send(subscription: PushSubscription, payload: ReminderPayload): Promise<"sent" | "expired" | "failed"> {
    if (!validPushEndpoint(subscription.endpoint)) return "failed";
    try {
      const result = await this.transport({ endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify({ type: payload.type, slotId: payload.slotId }), {
          vapidDetails: this.vapid, TTL: 0, timeout: 5000, urgency: "normal",
        });
      return result.statusCode >= 200 && result.statusCode < 300 ? "sent" :
        result.statusCode === 404 || result.statusCode === 410 ? "expired" : "failed";
    } catch (error: unknown) {

      return typeof error === "object" && error !== null && "statusCode" in error &&
        (error.statusCode === 404 || error.statusCode === 410) ? "expired" : "failed";
    }
  }
}
