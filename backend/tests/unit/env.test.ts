import { describe, expect, test } from "vitest";
import { loadEnv } from "../../src/config/env";

// Nilai uji fiktif; bukan kunci sungguhan.
const SUPABASE = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SECRET_KEY: "kunci-uji",
  GEMINI_API_KEY: "kunci-uji-gemini",
  GEMINI_MODEL: "model-uji",
};

describe("loadEnv", () => {
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
    expect(() => loadEnv({})).toThrow("Environment tidak valid: SUPABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL");
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
});
