import { ApiError, api } from "@/shared/lib";
import { photoBase64 } from "../lib/photo-base64";
import { parseScanTarget } from "../lib/scan-target";
import { scanResponseSchema, type ScanResponse } from "../schemas/scan-response";

export async function scanPackage(input: { blob: Blob; slotId?: string; signal: AbortSignal }): Promise<ScanResponse> {
  if (input.slotId !== undefined && parseScanTarget(input.slotId).mode !== "selected")
    throw new ApiError("VALIDATION_FAILED", 400, "Target scan tidak valid.");
  const data = await photoBase64(input.blob, input.signal);
  input.signal.throwIfAborted();
  const response = await api().json("/v1/scan", scanResponseSchema, { method: "POST", signal: input.signal,
    body: { image: { mimeType: "image/jpeg", data }, ...(input.slotId !== undefined ? { slotId: input.slotId } : {}) } });
  input.signal.throwIfAborted();
  if (input.slotId !== undefined && (response.outcome === "bisa_konfirmasi" || response.outcome === "dosis_sudah_tercatat")
    && response.slots.some((slot) => slot.slotId !== input.slotId))
    throw new ApiError("INVALID_RESPONSE", 200, "Target pada respons scan tidak sesuai.");
  return response;
}
