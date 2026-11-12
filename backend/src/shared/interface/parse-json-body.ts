import type { Context } from "hono";
import type { z } from "zod";
import { domainError, type DomainError } from "../domain/domain-error";
import { err, ok, type Result } from "../domain/result";

// Seluruh isian valid maksimum < 32 KiB; batas diterapkan sebelum JSON.parse
// agar kolom tambahan besar tidak menghabiskan memori sebelum dibuang zod.
export const MAX_JSON_BODY_BYTES = 32 * 1024;

async function boundedJson(c: Context): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const length = c.req.header("Content-Length");
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > MAX_JSON_BODY_BYTES)) return { ok: false };
  const reader = c.req.raw.body?.getReader();
  if (!reader) return { ok: false };
  try {
    const chunks: Uint8Array[] = []; let total = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_JSON_BODY_BYTES) { await reader.cancel(); return { ok: false }; }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch { return { ok: false }; }
  finally { reader.releaseLock(); }
}

/**
 * Membaca dan memvalidasi body JSON. Galat hanya menyebut nama kolom yang
 * salah, tidak pernah nilai yang dikirim (bisa berisi data pengguna).
 * Kolom yang tidak dikenal (mis. householdId) dibuang oleh skema objek zod.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  c: Context,
  schema: Schema,
): Promise<Result<z.output<Schema>, DomainError>> {
  const body = await boundedJson(c);
  if (!body.ok) {
    return err(domainError("VALIDATION_FAILED", "Isi permintaan harus JSON."));
  }

  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "(body)"))];
    return err(domainError("VALIDATION_FAILED", "Isi permintaan tidak valid.", { fields }));
  }
  return ok(parsed.data);
}
