import { expect } from "vitest";
import { z } from "zod";
import type { E2eSystem } from "./e2e-system";

export const MEDICINE_INPUT = { name: "Amlodipin", strength: "5 mg", purpose: "Kegunaan fiktif uji", doseAmount: "1 tablet", usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null, intakeTimes: ["07:00", "19:00"], labelSource: "keluarga", explanationOrigin: "teks_pengisi", explanation: null } as const;
// Biner sintetis, bukan foto; AI pembaca diganti port fiktif.
export const E2E_IMAGE = { mimeType: "image/jpeg", data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64") };
export const medicineSchema = z.object({ id: z.uuid(), name: z.string(), explanation: z.string().nullable(), explanationOrigin: z.enum(["ai_dikonfirmasi", "teks_pengisi"]), intakeTimes: z.array(z.string()) });
export const confirmationSchema = z.object({ level: z.enum(["dasar", "scan_terverifikasi"]), scheduledTime: z.string(), medicineId: z.uuid() });
export const dashboardSchema = z.object({ summary: z.object({ confirmed: z.number(), total: z.number() }), doses: z.array(z.object({ slotId: z.string(), medicineId: z.uuid(), scheduledTime: z.string(), status: z.string(), confirmation: confirmationSchema.nullable() })) });
export const scanSchema = z.object({ outcome: z.string(), slots: z.array(z.object({ slotId: z.string(), scanToken: z.string().optional() })).default([]) });

export async function call(system: E2eSystem, token: string, method: string, path: string, body?: unknown, status = 200) {
  const response = await fetch(`${system.origin}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(4_000) });
  const value: unknown = response.status === 204 ? null : await response.json();
  expect(system.transport.failures).toEqual([]);
  expect(response.status, `${method} ${path}`).toBe(status);
  return value;
}
export async function consent(system: E2eSystem, token: string, kind: "data" | "scan" = "data") {
  return call(system, token, "POST", "/v1/household/consents", { kind });
}
export async function addMedicine(system: E2eSystem, token: string, overrides: Record<string, unknown> = {}) {
  return medicineSchema.parse(await call(system, token, "POST", "/v1/medicines", { ...MEDICINE_INPUT, ...overrides }, 201));
}
export async function dashboard(system: E2eSystem, token: string) { return dashboardSchema.parse(await call(system, token, "GET", "/v1/doses/today")); }
export function confirmPath(slotId: string) { return `/v1/doses/${encodeURIComponent(slotId)}/confirm`; }
