import { z } from "zod";

// Hanya variabel yang sudah dipakai kode; rahasia cron menunggu fitur cron.
const DEV_FRONTEND_ORIGIN = "http://localhost:3000";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  FRONTEND_ORIGIN: z.url(),
  SUPABASE_URL: z.url(),
  // Secret key (sb_secret_...) pengganti service_role; hanya di server.
  SUPABASE_SECRET_KEY: z.string().min(1),
  // Nama model tidak ditulis di kode (docs/04, D8); kunci hanya di server.
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1),
  // Jatah panggilan AI per rumah tangga per hari WIB (D8). 20 = USULAN sampai uji kuota.
  AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(1_000).default(20),
  SCAN_TOKEN_SECRET: z.string().min(32),
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
