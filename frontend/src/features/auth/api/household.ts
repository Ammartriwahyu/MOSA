import { z } from "zod";
import { api } from "@/shared/lib";

// Bentuk respons GET /v1/household (backend household.mapper.ts).
export const householdSchema = z.object({
  dataConsentAt: z.string().nullable(),
  scanConsentAt: z.string().nullable(),
  outputMode: z.enum(["teks", "suara"]).nullable(),
  isDemo: z.boolean(),
});

export type Household = z.output<typeof householdSchema>;

export const householdQueryKey = ["household"] as const;

export function fetchHousehold(signal?: AbortSignal): Promise<Household> {
  return api().json("/v1/household", householdSchema, { signal });
}

/** Mencatat persetujuan penyimpanan data (MVP-01). Body `{ kind }` sesuai backend. */
export function recordDataConsent(): Promise<Household> {
  return api().json("/v1/household/consents", householdSchema, {
    method: "POST",
    body: { kind: "data" },
  });
}

/** Consent scan: jangan menganggap respons null sebagai persetujuan tersimpan. */
export function recordScanConsent(): Promise<Household> {
  return api().json("/v1/household/consents", householdSchema.extend({ scanConsentAt: z.iso.datetime(), dataConsentAt: z.iso.datetime() }), {
    method: "POST", body: { kind: "scan" },
  });
}
