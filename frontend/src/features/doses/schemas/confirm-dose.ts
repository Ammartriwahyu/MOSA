import { z } from "zod";
import { confirmationSchema } from "./todays-doses";

export const confirmDoseSchema = z.object({ status: z.literal("sudah"), serverTime: z.iso.datetime(), confirmation: confirmationSchema });
export type DoseConfirmation = z.infer<typeof confirmDoseSchema>;
