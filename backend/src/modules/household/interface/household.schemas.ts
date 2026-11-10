import { z } from "zod";

export const consentBodySchema = z.object({
  kind: z.enum(["data", "scan"]),
});

export const preferencesBodySchema = z.object({
  outputMode: z.enum(["teks", "suara"]),
});
