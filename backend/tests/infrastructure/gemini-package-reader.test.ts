import { afterEach, describe, expect, test, vi } from "vitest";
import { GeminiPackageReader, PACKAGE_READER_SYSTEM_INSTRUCTION } from "../../src/modules/verification/infrastructure/gemini-package-reader";
import { createPackageImage, PACKAGE_IMAGE_LIMITS, type PackageImage } from "../../src/modules/verification/domain/package-image";
import { GeminiJsonGenerator, type GenerateContent } from "../../src/shared/infrastructure/gemini-json-generator";

const READING = { names: ["Merek Uji Biru", "Amlodipine besylate"], strength: "5 mg", legible: true };
const RESPONSE = { text: JSON.stringify(READING) };
const UNREADABLE = { ok: true, value: { names: [], strength: null, legible: false } };

function image(): PackageImage {

  const created = createPackageImage({ bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), mimeType: "image/jpeg" });
  if (!created.ok) throw new Error("Fixture gambar tidak valid");
  return created.value;
}

function readerWith(generate: GenerateContent) {
  return new GeminiPackageReader(new GeminiJsonGenerator(generate, { model: "model-uji", retryDelayMs: 0 }));
}

afterEach(() => { vi.restoreAllMocks(); });

describe("GeminiPackageReader", () => {
  test("permintaan hanya instruksi tetap + inlineData, tanpa metadata akun/jadwal/obat", async () => {
    const generate = vi.fn<GenerateContent>().mockResolvedValue(RESPONSE);
    const input = { ...image(), householdId: "rumah-uji", filename: "rahasia-uji.jpg", slotId: "slot-uji", medicines: ["obat-uji-rahasia"] };
    expect(await readerWith(generate).read(input)).toEqual({ ok: true, value: READING });
    const request = generate.mock.calls[0]?.[0];
    expect(request?.contents).toEqual([{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: Buffer.from(input.bytes).toString("base64") } }] }]);
    expect(request?.config).toMatchObject({ systemInstruction: PACKAGE_READER_SYSTEM_INSTRUCTION, temperature: 0.2, responseMimeType: "application/json", responseJsonSchema: { required: ["names", "strength", "legible"], additionalProperties: false } });
    expect(request?.config?.abortSignal).toBeInstanceOf(AbortSignal);
    const serialized = JSON.stringify(request);
    for (const value of [input.householdId, input.filename, input.slotId, input.medicines[0]]) expect(serialized).not.toContain(value);
  });

  test("kekuatan null diteruskan, kode matcher yang menentukan hasil", async () => {
    const reading = { ...READING, strength: null };
    expect(await readerWith(async () => ({ text: JSON.stringify(reading) })).read(image())).toEqual({ ok: true, value: reading });
  });

  test.each([
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ])("MIME %s diteruskan sesuai byte gambar", async (mimeType, header) => {
    const created = createPackageImage({ mimeType, bytes: new Uint8Array(header) });
    if (!created.ok) throw new Error("Fixture gambar tidak valid");
    const generate = vi.fn<GenerateContent>().mockResolvedValue(RESPONSE);
    expect((await readerWith(generate).read(created.value)).ok).toBe(true);
    expect(generate.mock.calls[0]?.[0].contents).toEqual([{ role: "user", parts: [{ inlineData: { mimeType, data: Buffer.from(header).toString("base64") } }] }]);
  });

  test("hanya byte view gambar dikirim, tanpa byte lain pada buffer yang sama", async () => {
    const buffer = new Uint8Array([11, 12, ...image().bytes, 99, 98]);
    const bytes = buffer.subarray(2, buffer.length - 2);
    const generate = vi.fn<GenerateContent>().mockResolvedValue(RESPONSE);
    await readerWith(generate).read({ bytes, mimeType: "image/jpeg" });
    expect(generate.mock.calls[0]?.[0].contents).toEqual([{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: Buffer.from(image().bytes).toString("base64") } }] }]);
  });

  test("legible=false membuang nama/kekuatan yang ikut dihasilkan", async () => {
    expect(await readerWith(async () => ({ text: JSON.stringify({ ...READING, legible: false }) })).read(image())).toEqual(UNREADABLE);
  });

  test.each([
    ["JSON rusak", "bukan json"],
    ["kosong", undefined],
    ["kode markdown", '```json\n{"names":[],"strength":null,"legible":false}\n```'],
    ["null", "null"],
    ["larik", "[]"],
    ["kekuatan hilang", JSON.stringify({ names: ["Obat Uji"], legible: true })],
    ["kekuatan berbentuk objek", JSON.stringify({ ...READING, strength: { value: 5, unit: "mg" } })],
    ["nama kosong", JSON.stringify({ ...READING, names: [] })],
    ["nama hanya spasi", JSON.stringify({ ...READING, names: ["  "] })],
    ["nama bukan string", JSON.stringify({ ...READING, names: [5] })],
    ["legible bukan boolean", JSON.stringify({ ...READING, legible: "true" })],
    ["kolom keputusan AI tambahan", JSON.stringify({ ...READING, outcome: "bisa_konfirmasi", scanToken: "palsu" })],
    ["nama terlalu panjang", JSON.stringify({ ...READING, names: ["a".repeat(201)] })],
    ["nama terlalu banyak", JSON.stringify({ ...READING, names: Array.from({ length: 21 }, () => "Obat Uji") })],
    ["kekuatan terlalu panjang", JSON.stringify({ ...READING, strength: "5".repeat(81) })],
    ["kekuatan hanya spasi", JSON.stringify({ ...READING, strength: " " })],
  ])("keluaran %s menjadi tidak terbaca, tanpa retry", async (_label, text) => {
    const generate = vi.fn<GenerateContent>().mockResolvedValue({ text });
    expect(await readerWith(generate).read(image())).toEqual(UNREADABLE);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test.each([429, 503])("%s diulang paling banyak sekali dan dapat pulih", async (status) => {
    const generate = vi.fn<GenerateContent>().mockRejectedValueOnce({ status }).mockResolvedValue(RESPONSE);
    expect(await readerWith(generate).read(image())).toEqual({ ok: true, value: READING });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  test.each([[429, "AI_QUOTA_EXCEEDED"], [503, "AI_UNAVAILABLE"]])("%s dua kali menghasilkan %s", async (status, code) => {
    const generate = vi.fn<GenerateContent>().mockRejectedValue({ status });
    expect(await readerWith(generate).read(image())).toMatchObject({ ok: false, error: { code } });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  test.each([400, 401, 500])("%s tidak diulang dan bukan bacaan sukses", async (status) => {
    const generate = vi.fn<GenerateContent>().mockRejectedValue({ status });
    expect(await readerWith(generate).read(image())).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test("galat jaringan dinetralkan tanpa nama/byte SDK dalam hasil atau log", async () => {
    const logs = [vi.spyOn(console, "info"), vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")];
    const generate = vi.fn<GenerateContent>().mockRejectedValue(new Error("nama-uji bytes-uji kunci-uji"));
    const result = await readerWith(generate).read(image());
    expect(result).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE", details: null } });
    expect(JSON.stringify(result)).not.toMatch(/nama-uji|bytes-uji|kunci-uji/);
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  test("gambar yang berubah setelah validasi ditolak sebelum SDK", async () => {
    const input = image();
    input.bytes.fill(0);
    const generate = vi.fn<GenerateContent>().mockResolvedValue(RESPONSE);
    expect(await readerWith(generate).read(input)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(generate).not.toHaveBeenCalled();
  });

  test("gambar terlalu besar ditolak sebelum SDK", async () => {
    const bytes = new Uint8Array(PACKAGE_IMAGE_LIMITS.maxBytes + 1);
    bytes.set(image().bytes);
    const generate = vi.fn<GenerateContent>().mockResolvedValue(RESPONSE);
    expect(await readerWith(generate).read({ bytes, mimeType: "image/jpeg" })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(generate).not.toHaveBeenCalled();
  });

  test("respons yang datang setelah deadline tidak diterima sebagai bacaan sukses", async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const generate = vi.fn<GenerateContent>().mockImplementation(async () => {
      controller.abort();
      return RESPONSE;
    });
    expect(await readerWith(generate).read(image())).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
