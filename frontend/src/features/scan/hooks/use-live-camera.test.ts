import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useLiveCamera } from "./use-live-camera";

function fakeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

function mockGetUserMedia(impl: () => Promise<MediaStream>) {
  const getUserMedia = vi.fn(impl);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  return getUserMedia;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("useLiveCamera", () => {
  test("tanpa dukungan kamera di browser → cadangan", async () => {
    const { result } = renderHook(() => useLiveCamera(true));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });

  test("tidak aktif → kamera tidak diminta", () => {
    const getUserMedia = mockGetUserMedia(async () => fakeStream().stream);
    const { result } = renderHook(() => useLiveCamera(false));
    expect(result.current.status).toBe("off");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  test("kamera belakang menyala lalu dimatikan saat tidak aktif lagi", async () => {
    const { stream, track } = fakeStream();
    const getUserMedia = mockGetUserMedia(async () => stream);
    const { result, rerender } = renderHook(({ active }) => useLiveCamera(active), { initialProps: { active: true } });
    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: "environment" } }) }));
    rerender({ active: false });
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.status).toBe("off");
  });

  test("halaman ditinggal mematikan kamera", async () => {
    const { stream, track } = fakeStream();
    mockGetUserMedia(async () => stream);
    const { result, unmount } = renderHook(() => useLiveCamera(true));
    await waitFor(() => expect(result.current.status).toBe("live"));
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  test("aliran yang datang setelah dibatalkan langsung dimatikan", async () => {
    const { stream, track } = fakeStream();
    let resolve: (value: MediaStream) => void = () => undefined;
    mockGetUserMedia(() => new Promise((done) => { resolve = done; }));
    const { unmount } = renderHook(() => useLiveCamera(true));
    unmount();
    await act(async () => { resolve(stream); });
    expect(track.stop).toHaveBeenCalled();
  });

  test.each([["NotAllowedError", "denied"], ["NotFoundError", "unavailable"]] as const)("galat %s → %s", async (name, status) => {
    mockGetUserMedia(async () => { throw new DOMException("uji", name); });
    const { result } = renderHook(() => useLiveCamera(true));
    await waitFor(() => expect(result.current.status).toBe(status));
  });
});
