import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { compressPhoto } from "./compress-photo";
import { fittedDimensions, PHOTO_POLICY } from "./photo-policy";

const NativeURL = URL;
let loadedImage: HTMLImageElement;
let loadEvent = "load";
let dimensions = { width: 4800, height: 3200 };
const revoke = vi.fn();
const create = vi.fn();
const draw = vi.fn();
const file = (type = "image/jpeg", size = 10) => new File([new Uint8Array(size)], "nama-pribadi-tidak-dikirim.jpg", { type });

beforeEach(() => {
  revoke.mockReset(); create.mockReset(); draw.mockReset();
  create.mockReturnValue("blob:source-uji");
  vi.stubGlobal("URL", class extends NativeURL { static createObjectURL = create; static revokeObjectURL = revoke; });
  loadEvent = "load"; dimensions = { width: 4800, height: 3200 };
  vi.spyOn(window, "Image").mockImplementation(function () {
    const image = document.createElement("img"); loadedImage = image;
    Object.defineProperty(image, "naturalWidth", { get: () => dimensions.width });
    Object.defineProperty(image, "naturalHeight", { get: () => dimensions.height });
    Object.defineProperty(image, "src", { set(value: string) { if (value) queueMicrotask(() => image.dispatchEvent(new Event(loadEvent))); } });
    return image;
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillRect: vi.fn(), drawImage: draw } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => callback(new Blob([new Uint8Array(100)], { type })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("kompresi foto di memori", () => {
  test("mempertahankan rasio, membatasi dimensi, mengeluarkan JPEG tanpa nama File", async () => {
    const result = await compressPhoto(file("image/png"), new AbortController().signal);
    expect(result.width).toBe(1600); expect(result.height).toBe(1067);
    expect(result.blob.type).toBe("image/jpeg"); expect(result.blob.size).toBeLessThanOrEqual(PHOTO_POLICY.maxBytes);
    expect(result.blob).not.toHaveProperty("name");
    expect(revoke).toHaveBeenCalledWith("blob:source-uji");
    expect(loadedImage.onload).toBeNull(); expect(loadedImage.onerror).toBeNull();
  });
  test("kualitas diturunkan bila hasil masih melebihi batas", async () => {
    const sizes = [1_500_001, 1_500_001, 1_500_000];
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback, type) => callback(new Blob([new Uint8Array(sizes.shift() ?? 0)], { type })));
    expect((await compressPhoto(file(), new AbortController().signal)).blob.size).toBe(1_500_000);
  });
  test("dimensi dikurangi jika kualitas terendah masih terlalu besar", async () => {
    let calls = 0;
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback, type) => callback(new Blob([new Uint8Array(++calls <= 3 ? 1_500_001 : 100)], { type })));
    const result = await compressPhoto(file(), new AbortController().signal);
    expect(result.width).toBe(1280); expect(result.height).toBe(853);
  });
  test.each(["image/svg+xml", "image/gif", "image/heic", "text/plain", ""])("format %s ditolak sebelum URL dibuat", async (type) => {
    await expect(compressPhoto(file(type), new AbortController().signal)).rejects.toMatchObject({ reason: "unsupported" });
    expect(create).not.toHaveBeenCalled();
  });
  test("file kosong/terlalu besar ditolak sebelum decode", async () => {
    await expect(compressPhoto(file("image/jpeg", 0), new AbortController().signal)).rejects.toMatchObject({ reason: "unreadable" });
    await expect(compressPhoto(file("image/jpeg", PHOTO_POLICY.maxInputBytes + 1), new AbortController().signal)).rejects.toMatchObject({ reason: "too_large" });
    expect(create).not.toHaveBeenCalled();
  });
  test("decode gagal tetap melepaskan URL", async () => {
    loadEvent = "error";
    await expect(compressPhoto(file(), new AbortController().signal)).rejects.toMatchObject({ reason: "unreadable" });
    expect(revoke).toHaveBeenCalledWith("blob:source-uji");
  });
  test.each([null, new Blob(["x"], { type: "image/png" }), new Blob([], { type: "image/jpeg" })])("encoder null/format salah/kosong ditolak", async (blob) => {
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => callback(blob));
    await expect(compressPhoto(file(), new AbortController().signal)).rejects.toMatchObject({ reason: "compression" });
    expect(revoke).toHaveBeenCalled();
  });
  test("tidak mengirim hasil yang tetap terlalu besar setelah batas percobaan", async () => {
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback, type) => callback(new Blob([new Uint8Array(1_500_001)], { type })));
    await expect(compressPhoto(file(), new AbortController().signal)).rejects.toMatchObject({ reason: "too_large" });
    expect(revoke).toHaveBeenCalled();
  });
  test("pembatalan saat encoding tidak menunggu callback dan membersihkan sumber", async () => {
    const controller = new AbortController();
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(() => { controller.abort(); });
    await expect(compressPhoto(file(), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(revoke).toHaveBeenCalled();
  });
  test("canvas tidak tersedia gagal tertutup", async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    await expect(compressPhoto(file(), new AbortController().signal)).rejects.toMatchObject({ reason: "compression" });
  });
  test("gambar tidak diperbesar dan gambar ekstrem ditolak", () => {
    expect(fittedDimensions(400, 800, 1600)).toEqual({ width: 400, height: 800 });
    expect(() => fittedDimensions(100_000, 100_000, 1600)).toThrow();
    expect(() => fittedDimensions(0, 10, 1600)).toThrow();
  });
});
