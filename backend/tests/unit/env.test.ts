import { describe, expect, test } from "vitest";
import { loadEnv } from "../../src/config/env";

describe("loadEnv", () => {
  test("memakai origin frontend lokal dan port bawaan saat pengembangan", () => {
    const env = loadEnv({});
    expect(env.FRONTEND_ORIGIN).toBe("http://localhost:3000");
    expect(env.PORT).toBe(8787);
    expect(env.NODE_ENV).toBe("development");
  });

  test("mewajibkan FRONTEND_ORIGIN di produksi", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow("FRONTEND_ORIGIN");
  });

  test("menolak FRONTEND_ORIGIN yang bukan URL tanpa membocorkan nilainya", () => {
    expect(() => loadEnv({ FRONTEND_ORIGIN: "nilai-rahasia" })).toThrow(
      "Environment tidak valid: FRONTEND_ORIGIN",
    );
    expect(() => loadEnv({ FRONTEND_ORIGIN: "nilai-rahasia" })).not.toThrow("nilai-rahasia");
  });

  test("mengubah PORT menjadi angka dan menolak port tidak valid", () => {
    expect(loadEnv({ PORT: "9000" }).PORT).toBe(9000);
    expect(() => loadEnv({ PORT: "0" })).toThrow("PORT");
  });
});
