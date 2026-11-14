import { z } from "zod";

const DEV_FRONTEND_ORIGIN = "http://localhost:3000";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  FRONTEND_ORIGIN: z.url(),
  SUPABASE_URL: z.url(),

  SUPABASE_SECRET_KEY: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1),

  AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(1_000).default(20),
  SCAN_TOKEN_SECRET: z.string().min(32),
  PUSH_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CRON_SECRET: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
}).superRefine((env, context) => {
  if (!env.PUSH_ENABLED) return;
  const fields: [string, boolean][] = [
    ["CRON_SECRET", (env.CRON_SECRET?.trim().length ?? 0) >= 32],
    ["VAPID_PUBLIC_KEY", /^B[A-P][A-Za-z0-9_-]{85}$/.test(env.VAPID_PUBLIC_KEY ?? "")],
    ["VAPID_PRIVATE_KEY", /^[A-Za-z0-9_-]{43}$/.test(env.VAPID_PRIVATE_KEY ?? "")],
    ["VAPID_SUBJECT", /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(env.VAPID_SUBJECT ?? "")],
  ];
  for (const [field, valid] of fields) if (!valid) context.addIssue({ code: "custom", path: [field], message: "required" });
});

export type Env = z.infer<typeof envSchema>;

type EnvSource = Record<string, string | undefined>;

export function loadEnv(source: EnvSource): Env {
  const input: EnvSource = { ...source };

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
