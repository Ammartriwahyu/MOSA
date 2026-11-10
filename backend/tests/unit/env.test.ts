import { describe, expect, test } from "vitest";
import { loadEnv } from "../../src/config/env";

// Nilai uji fiktif; bukan kunci sungguhan.
const SUPABASE = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SECRET_KEY: "kunci-uji",
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
    expect(() => loadEnv({})).toThrow("Environment tidak valid: SUPABASE_URL, SUPABASE_SECRET_KEY");
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
});
