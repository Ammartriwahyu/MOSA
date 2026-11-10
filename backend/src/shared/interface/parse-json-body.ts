import type { Context } from "hono";
import type { z } from "zod";
import { domainError, type DomainError } from "../domain/domain-error";
import { err, ok, type Result } from "../domain/result";

/**
 * Membaca dan memvalidasi body JSON. Galat hanya menyebut nama kolom yang
 * salah, tidak pernah nilai yang dikirim (bisa berisi data pengguna).
 * Kolom yang tidak dikenal (mis. householdId) dibuang oleh skema objek zod.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  c: Context,
  schema: Schema,
): Promise<Result<z.output<Schema>, DomainError>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return err(domainError("VALIDATION_FAILED", "Isi permintaan harus JSON."));
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "(body)"))];
    return err(domainError("VALIDATION_FAILED", "Isi permintaan tidak valid.", { fields }));
  }
  return ok(parsed.data);
}
