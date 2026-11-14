import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";

export type PushKeys = { p256dh: string; auth: string };
export type PushRegistration = { endpoint: string; keys: PushKeys };
export type PushSubscription = PushRegistration & { id: string; householdId: string };

export function validPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > 4096 || endpoint.trim() !== endpoint) return false;
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      (host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
        /^[a-z0-9-]+\.push\.apple\.com$/.test(host));
  } catch { return false; }
}

export function createPushRegistration(input: PushRegistration): Result<PushRegistration, DomainError> {
  const fields: string[] = [];
  if (!validPushEndpoint(input.endpoint)) fields.push("endpoint");
  if (!/^B[A-P][A-Za-z0-9_-]{85}$/.test(input.keys.p256dh)) fields.push("p256dh");
  if (!/^[A-Za-z0-9_-]{21}[AQgw]$/.test(input.keys.auth)) fields.push("auth");
  return fields.length ? err(domainError("VALIDATION_FAILED", "Langganan push tidak valid.", { fields })) :
    ok({ endpoint: input.endpoint, keys: { ...input.keys } });
}
