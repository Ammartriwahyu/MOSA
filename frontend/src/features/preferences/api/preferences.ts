import { z } from "zod";
import { api } from "@/shared/lib";

export type OutputMode = "teks" | "suara";

const householdSchema = z.object({
  dataConsentAt: z.string().nullable(),
  scanConsentAt: z.string().nullable(),
  outputMode: z.enum(["teks", "suara"]).nullable(),
  isDemo: z.boolean(),
});

export function updateOutputMode(outputMode: OutputMode) {
  return api().json("/v1/household/preferences", householdSchema.refine((row) => row.outputMode === outputMode), {
    method: "PATCH",
    body: { outputMode },
  });
}
