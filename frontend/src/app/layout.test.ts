import { expect, test } from "vitest";
import { NAMA_APLIKASI } from "@/shared/copy";
import { metadata, viewport } from "./layout";

test("viewport mengizinkan perbesaran (pengguna lansia)", () => {
  expect(viewport).toMatchObject({ width: "device-width", initialScale: 1 });
  expect(viewport).not.toHaveProperty("maximumScale");
  expect(viewport).not.toHaveProperty("userScalable");
});

test("judul halaman memakai nama aplikasi dari copy", () => {
  expect(metadata.title).toBe(NAMA_APLIKASI);
});
