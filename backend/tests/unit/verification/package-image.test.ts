import { describe, expect, test } from "vitest";
import { createPackageImage, PACKAGE_IMAGE_LIMITS } from "../../../src/modules/verification/domain/package-image";

const jpeg = [0xff, 0xd8, 0xff, 0xe0];
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const webp = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

describe("createPackageImage", () => {
  test.each([["image/jpeg", jpeg], ["image/png", png], ["image/webp", webp]])("menerima header %s", (mimeType, header) => {
    const bytes = new Uint8Array(header);
    expect(createPackageImage({ mimeType, bytes })).toEqual({ ok: true, value: { mimeType, bytes } });
  });

  test("tepat 1.500.000 byte diterima", () => {
    const bytes = new Uint8Array(PACKAGE_IMAGE_LIMITS.maxBytes);
    bytes.set(jpeg);
    expect(createPackageImage({ bytes, mimeType: "image/jpeg" }).ok).toBe(true);
  });

  test("batas +1 byte ditolak", () => {
    const bytes = new Uint8Array(PACKAGE_IMAGE_LIMITS.maxBytes + 1);
    bytes.set(jpeg);
    expect(createPackageImage({ bytes, mimeType: "image/jpeg" })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED", details: { field: "image" } } });
  });

  test.each(["", "image/gif", "image/heic", "application/pdf", "image/svg+xml", "https://contoh.invalid/gambar", "image/jpg"])("MIME di luar daftar ditolak: %s", (mimeType) => {
    expect(createPackageImage({ bytes: new Uint8Array(jpeg), mimeType }))
      .toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED", details: { field: "mimeType" } } });
  });

  test.each([
    ["image/jpeg", []],
    ["image/jpeg", [0xff, 0xd8]],
    ["image/png", png.slice(0, 7)],
    ["image/webp", webp.slice(0, 11)],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]],
    ["image/png", jpeg],
    ["image/jpeg", png],
    ["image/jpeg", [0x3c, 0x73, 0x76, 0x67]],
  ])("header kosong/rusak/tidak sesuai MIME %s ditolak", (mimeType, header) => {
    expect(createPackageImage({ bytes: new Uint8Array(header), mimeType }))
      .toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED", details: { field: "image" } } });
  });

  test("galat tidak membawa MIME bebas atau byte gambar", () => {
    const mimeType = "teks-uji-yang-tidak-boleh-ada-di-galat";
    const result = createPackageImage({ bytes: new TextEncoder().encode("byte-uji-rahasia"), mimeType });
    expect(JSON.stringify(result)).not.toContain(mimeType);
    expect(JSON.stringify(result)).not.toContain("byte-uji-rahasia");
  });
});
