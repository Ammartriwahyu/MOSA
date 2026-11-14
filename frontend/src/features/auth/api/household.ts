import { z } from "zod";
import { api } from "@/shared/lib";

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

export function recordDataConsent(): Promise<Household> {
  return api().json("/v1/household/consents", householdSchema, {
    method: "POST",
    body: { kind: "data" },
  });
}

export function recordScanConsent(): Promise<Household> {
  return api().json("/v1/household/consents", householdSchema.extend({ scanConsentAt: z.iso.datetime(), dataConsentAt: z.iso.datetime() }), {
    method: "POST", body: { kind: "scan" },
  });
}
