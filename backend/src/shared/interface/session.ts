import type { Context } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    householdId: string;
    hasDataConsent: boolean;
  }
}

const PUBLIC_PATHS: ReadonlySet<string> = new Set(["/v1/health"]);

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}

export function isConsentExempt(path: string): boolean {
  return isPublicPath(path) || path === "/v1/household" || path.startsWith("/v1/household/");
}

export type Session = { readonly userId: string; readonly householdId: string };

export function sessionOf(c: Context): Session {
  const userId = c.get("userId");
  const householdId = c.get("householdId");
  if (!userId || !householdId) {
    throw new Error("Rute terlindungi dipanggil tanpa sesi: periksa urutan middleware.");
  }
  return { userId, householdId };
}
