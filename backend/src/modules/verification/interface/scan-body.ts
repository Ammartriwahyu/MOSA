import type { Context } from "hono";
import { z } from "zod";
import { domainError } from "../../../shared/domain/domain-error";
import { err, ok } from "../../../shared/domain/result";
import { createPackageImage, PACKAGE_IMAGE_LIMITS } from "../domain/package-image";

const MAX_BASE64_LENGTH = Math.ceil(PACKAGE_IMAGE_LIMITS.maxBytes / 3) * 4;
export const MAX_SCAN_REQUEST_BYTES = MAX_BASE64_LENGTH + 4096;
const bodySchema = z.object({ image: z.object({ mimeType: z.string().max(32),
  data: z.string().min(4).max(MAX_BASE64_LENGTH).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine((data) => data.length % 4 === 0) }),
  slotId: z.string().min(1).max(256).regex(/^[^:\s]+:\d{8}:\d{4}$/).optional() });
const invalid = () => err(domainError("VALIDATION_FAILED", "Isi permintaan scan tidak valid.", { field: "image" }));

export async function parseScanBody(c: Context) {
  if (c.req.header("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return invalid();
  const length = c.req.header("Content-Length");
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > MAX_SCAN_REQUEST_BYTES)) return invalid();
  const reader = c.req.raw.body?.getReader();
  if (!reader) return invalid();
  let raw: unknown;
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_SCAN_REQUEST_BYTES) { await reader.cancel(); return invalid(); }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return invalid(); }
  finally { reader.releaseLock(); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return invalid();
  const bytes = Buffer.from(parsed.data.image.data, "base64");
  if (bytes.toString("base64") !== parsed.data.image.data) return invalid();
  const image = createPackageImage({ bytes, mimeType: parsed.data.image.mimeType });
  if (!image.ok) return image;
  return ok({ image: image.value, ...(parsed.data.slotId !== undefined ? { slotId: parsed.data.slotId } : {}) });
}
