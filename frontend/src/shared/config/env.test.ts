import { expect, test } from "vitest";
import { readPublicEnv } from "./env";

// Nilai fiktif untuk uji.
const VALID = {
  NEXT_PUBLIC_API_URL: "http://localhost:8787/",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_uji",
};

test("membaca env publik dan membuang garis miring akhir alamat backend", () => {
  expect(readPublicEnv(VALID)).toEqual({
    apiUrl: "http://localhost:8787",
    supabaseUrl: "http://127.0.0.1:54321",
    supabasePublishableKey: "sb_publishable_uji",
  });
});

test("env kurang → galat yang menyebut nama variabel saja", () => {
  expect(() => readPublicEnv({})).toThrow(
    "Isi frontend/.env.local: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
});
