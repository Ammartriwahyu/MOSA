import { createApp } from "../../src/create-app";
import { z } from "zod";
import type { PackageReading } from "../../src/modules/verification/domain/package-reading";
import { HmacScanTokens, CurrentMedicineScanTokenVerifier } from "../../src/modules/verification/infrastructure/hmac-scan-tokens";
import type { DomainError } from "../../src/shared/domain/domain-error";
import { err, ok, type Result } from "../../src/shared/domain/result";
import { dosingTestSystem } from "./dosing-test-system";
import { householdFixture, InMemoryHouseholdRepository } from "./in-memory-household-repository";
import { testContainer } from "./test-container";

export const SCAN_IMAGE = { mimeType: "image/jpeg", data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64") };
export const scanOptions = (body: unknown = { image: SCAN_IMAGE }, token = "token-a") => ({ method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const scanResponseSchema = z.object({ outcome: z.string(), serverTime: z.iso.datetime(),
  slots: z.array(z.object({ slotId: z.string(), scanToken: z.string().optional(), expiresAt: z.iso.datetime().optional() }).passthrough()).default([]),
  medicine: z.object({ id: z.string(), explanation: z.string().nullable() }).passthrough().optional(),
  nextDose: z.object({ jam: z.string() }).passthrough().nullable().optional(),
  otherDueSlots: z.array(z.object({ medicineId: z.string() }).passthrough()).optional(),
}).passthrough();
export async function readScanResponse(response: Response) { return scanResponseSchema.parse(await response.json()); }

export function scanTestSystem(consent = true) {
  const system = dosingTestSystem();
  const tokens = new HmacScanTokens("only-for-http-tests-secret-32-bytes", system.clock);
  const households = new InMemoryHouseholdRepository([
    householdFixture({ id: "rumah-a", ownerUserId: "user-a", dataConsentAt: 1, scanConsentAt: consent ? 1 : null }),
    householdFixture({ id: "rumah-b", ownerUserId: "user-b", dataConsentAt: 1, scanConsentAt: 1 }),
  ]);
  let reading: Result<PackageReading, DomainError> = ok({ names: ["Obat Uji"], strength: "5 mg", legible: true });
  let quotaError: DomainError | null = null;
  let beforeReading = () => {};
  let readerCalls = 0;
  const quotaCalls: string[] = [];
  const container = testContainer({ tokens: { "token-a": "user-a", "token-b": "user-b" }, households,
    medicines: system.medicines, confirmations: system.confirmations, clock: system.clock,
    scanTokens: new CurrentMedicineScanTokenVerifier(tokens, system.reader), scanSigner: tokens,
    packageReader: { read: async () => { readerCalls += 1; beforeReading(); return reading; } },
    aiUsage: { consume: async (householdId) => { quotaCalls.push(householdId); return quotaError ? err(quotaError) : ok(undefined); } },
  });
  return { ...system, app: createApp(container), container, households, quotaCalls, readerCalls: () => readerCalls,
    setReading: (value: Result<PackageReading, DomainError>) => { reading = value; },
    setQuotaError: (value: DomainError) => { quotaError = value; },
    beforeReading: (action: () => void) => { beforeReading = action; } };
}
