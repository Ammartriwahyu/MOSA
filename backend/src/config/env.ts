import { z } from "zod";

// Hanya variabel yang sudah dipakai kode. Variabel Supabase, Gemini, dan token
// scan ditambahkan sebagai wajib di branch yang pertama kali memakainya.
const DEV_FRONTEND_ORIGIN = "http://localhost:3000";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  FRONTEND_ORIGIN: z.url(),
});

export type Env = z.infer<typeof envSchema>;

type EnvSource = Record<string, string | undefined>;

/**
 * Membaca dan memvalidasi environment. Gagal cepat (throw) karena konfigurasi
 * yang salah adalah bug penyebaran, bukan kegagalan yang diharapkan.
 * Pesan galat hanya menyebut nama variabel, tidak pernah nilainya.
 */
export function loadEnv(source: EnvSource): Env {
  const input: EnvSource = { ...source };
  // Di lokal, frontend default berjalan di port 3000. Di produksi wajib diisi.
  if (input.NODE_ENV !== "production" && !input.FRONTEND_ORIGIN) {
    input.FRONTEND_ORIGIN = DEV_FRONTEND_ORIGIN;
  }

  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Environment tidak valid: ${names.join(", ")}`);
  }
  return parsed.data;
}
