import { describe, expect, test } from "vitest";
import { loadEnv } from "../../src/config/env";

// Nilai uji fiktif; bukan kunci sungguhan.
const SUPABASE = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SECRET_KEY: "kunci-uji",
  GEMINI_API_KEY: "kunci-uji-gemini",
  GEMINI_MODEL: "model-uji",
  SCAN_TOKEN_SECRET: "secret-only-for-tests-not-production",
};

describe("loadEnv", () => {
  test("push opsional; konfigurasi lengkap diwajibkan hanya saat aktif", () => {
    expect(loadEnv(SUPABASE).PUSH_ENABLED).toBe(false);
    const run = () => loadEnv({ ...SUPABASE, PUSH_ENABLED: "true" });
    expect(run).toThrow("CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT");
    const enabled = { ...SUPABASE, PUSH_ENABLED: "true", CRON_SECRET: "c".repeat(32),
      VAPID_PUBLIC_KEY: `BA${"A".repeat(85)}`, VAPID_PRIVATE_KEY: "A".repeat(43), VAPID_SUBJECT: "mailto:demo@example.test" };
    expect(loadEnv(enabled).PUSH_ENABLED).toBe(true);
    expect(() => loadEnv({ ...enabled, CRON_SECRET: "secret-short" })).toThrow("Environment tidak valid: CRON_SECRET");
    expect(() => loadEnv({ ...enabled, VAPID_SUBJECT: "http://localhost" })).toThrow("VAPID_SUBJECT");
  });
  test("memakai origin frontend lokal dan port bawaan saat pengembangan", () => {
    const env = loadEnv(SUPABASE);
    expect(env.FRONTEND_ORIGIN).toBe("http://localhost:3000");
    expect(env.PORT).toBe(8787);
    expect(env.NODE_ENV).toBe("development");
  });

  test("mewajibkan FRONTEND_ORIGIN di produksi", () => {
    expect(() => loadEnv({ ...SUPABASE, NODE_ENV: "production" })).toThrow("FRONTEND_ORIGIN");
  });

  test("mewajibkan variabel Supabase", () => {
    expect(() => loadEnv({})).toThrow("Environment tidak valid: SUPABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL, SCAN_TOKEN_SECRET");
  });

  test("menolak nilai tidak valid tanpa membocorkan nilainya", () => {
    const run = () => loadEnv({ ...SUPABASE, FRONTEND_ORIGIN: "nilai-rahasia" });
    expect(run).toThrow("Environment tidak valid: FRONTEND_ORIGIN");
    expect(run).not.toThrow("nilai-rahasia");
  });

  test("mengubah PORT menjadi angka dan menolak port tidak valid", () => {
    expect(loadEnv({ ...SUPABASE, PORT: "9000" }).PORT).toBe(9000);
    expect(() => loadEnv({ ...SUPABASE, PORT: "0" })).toThrow("PORT");
  });

  test("jatah AI harian: bawaan 20, harus bilangan bulat positif", () => {
    expect(loadEnv(SUPABASE).AI_DAILY_LIMIT).toBe(20);
    expect(loadEnv({ ...SUPABASE, AI_DAILY_LIMIT: "5" }).AI_DAILY_LIMIT).toBe(5);
    expect(() => loadEnv({ ...SUPABASE, AI_DAILY_LIMIT: "0" })).toThrow("AI_DAILY_LIMIT");
  });

  test.each([undefined, "", "pendek"])("mewajibkan rahasia HMAC panjang tanpa mencetak nilainya", (secret) => {
    expect(() => loadEnv({ ...SUPABASE, SCAN_TOKEN_SECRET: secret })).toThrow("Environment tidak valid: SCAN_TOKEN_SECRET");
  });
});
