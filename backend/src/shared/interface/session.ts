import type { Context } from "hono";

// Nilai sesi yang dipasang middleware autentikasi dan rumah tangga.
// householdId hanya berasal dari sini (token tervalidasi), tidak pernah
// dari body atau query (CLAUDE.md aturan #5).
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    householdId: string;
    hasDataConsent: boolean;
  }
}

/** Rute yang bisa diakses tanpa login. */
const PUBLIC_PATHS: ReadonlySet<string> = new Set(["/v1/health"]);

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}

/** Rute yang tetap bisa diakses sebelum persetujuan data (docs/03 §6.1). */
export function isConsentExempt(path: string): boolean {
  return isPublicPath(path) || path === "/v1/household" || path.startsWith("/v1/household/");
}

export type Session = { readonly userId: string; readonly householdId: string };

/** Sesi untuk rute terlindungi. Melempar hanya bila middleware lupa dipasang (bug). */
export function sessionOf(c: Context): Session {
  const userId = c.get("userId");
  const householdId = c.get("householdId");
  if (!userId || !householdId) {
    throw new Error("Rute terlindungi dipanggil tanpa sesi: periksa urutan middleware.");
  }
  return { userId, householdId };
}
