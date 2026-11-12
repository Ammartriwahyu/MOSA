import { afterEach, describe, expect, test, vi } from "vitest";
import { GeminiJsonGenerator, type GenerateContent, type GeminiJsonRequest } from "../../src/shared/infrastructure/gemini-json-generator";

const REQUEST: GeminiJsonRequest = { systemInstruction: "Instruksi uji", contents: "Data fiktif", responseJsonSchema: { type: "object" } };
const generator = (generate: GenerateContent) => new GeminiJsonGenerator(generate, { model: "model-uji", retryDelayMs: 60_000 });

afterEach(() => { vi.restoreAllMocks(); });

describe("GeminiJsonGenerator", () => {
  test.each([undefined, "", "bukan JSON"])("JSON %j tetap galat secara default untuk explainer", async (text) => {
    expect(await generator(async () => ({ text })).generateJson(REQUEST)).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
  });

  test.each([undefined, "", "bukan JSON"])("JSON %j menjadi null hanya bila konsumen memilihnya", async (text) => {
    expect(await generator(async () => ({ text })).generateJson({ ...REQUEST, invalidJson: "null" })).toEqual({ ok: true, value: null });
  });

  test("galat jaringan tetap gagal walau invalidJson=null", async () => {
    const generate = vi.fn<GenerateContent>().mockRejectedValue(new Error("galat-uji-rahasia"));
    expect(await generator(generate).generateJson({ ...REQUEST, invalidJson: "null" })).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE", details: null } });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test("deadline menyelesaikan permintaan meski SDK tidak mendengarkan abort", async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const generate = vi.fn<GenerateContent>().mockImplementation(() => new Promise(() => {}));
    const pending = generator(generate).generateJson(REQUEST);
    controller.abort();
    expect(await pending).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test.each([429, 503])("deadline membatalkan jeda retry %s tanpa menunggu 60 detik", async (status) => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const generate = vi.fn<GenerateContent>().mockRejectedValue({ status });
    const pending = generator(generate).generateJson(REQUEST);
    // Beri kesempatan promise penolakan melewati helper sebelum membatalkan jeda.
    for (let index = 0; index < 5; index += 1) await Promise.resolve();
    controller.abort();
    expect(await pending).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test("sinyal yang sudah batal tidak memanggil SDK", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const generate = vi.fn<GenerateContent>().mockResolvedValue({ text: "{}" });
    expect(await generator(generate).generateJson(REQUEST)).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
    expect(generate).not.toHaveBeenCalled();
  });
});
