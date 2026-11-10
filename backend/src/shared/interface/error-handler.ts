import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

// Format galat seragam (docs/03 §9). Pemetaan galat domain → HTTP
// ditambahkan di sini saat modul pertama memakainya.
export type ErrorBody = {
  error: { code: string; message: string; details: unknown };
};

export function errorBody(code: string, message: string, details: unknown = null): ErrorBody {
  return { error: { code, message, details } };
}

const HTTP_EXCEPTION_CODES: Partial<Record<number, string>> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  404: "NOT_FOUND",
};

export const handleNotFound: NotFoundHandler = (c) =>
  c.json(errorBody("NOT_FOUND", "Alamat tidak ditemukan."), 404);

export const handleError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode;
    const code = HTTP_EXCEPTION_CODES[status] ?? "INTERNAL_ERROR";
    return c.json(errorBody(code, "Permintaan tidak dapat diproses."), status);
  }

  // Bug tak terduga. Log hanya pola rute dan metode: tanpa isi permintaan,
  // tanpa pesan galat (bisa memuat data pengguna).
  console.error(
    JSON.stringify({
      level: "error",
      code: "INTERNAL_ERROR",
      method: c.req.method,
      route: c.req.routePath,
    }),
  );
  return c.json(errorBody("INTERNAL_ERROR", "Terjadi kesalahan di server."), 500);
};
