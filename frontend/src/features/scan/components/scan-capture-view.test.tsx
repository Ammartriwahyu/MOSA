import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DRAFT, SCAN_CAPTURE } from "@/shared/copy";
import { grabVideoFrame } from "../lib/grab-video-frame";
import { ScanCaptureView } from "./scan-capture-view";

vi.mock("../lib/grab-video-frame", () => ({ grabVideoFrame: vi.fn() }));

function capture() {
  return { photo: null, processing: false, error: null, select: vi.fn(async () => undefined), clear: vi.fn() };
}

function setup(enabled = true) {
  const value = capture();
  render(<ScanCaptureView capture={value} target={{ mode: "generic" }} headingRef={createRef()} enabled={enabled} />);
  return value;
}

function mockCamera(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(impl) } });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "mediaDevices");
  vi.mocked(grabVideoFrame).mockReset();
});

describe("ScanCaptureView kamera langsung", () => {
  test("pratinjau tampil di halaman dan tombol bulat memotret bingkai kamera", async () => {
    mockCamera(async () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream);
    const frame = new File(["jpeg"], "kamera.jpg", { type: "image/jpeg" });
    vi.mocked(grabVideoFrame).mockResolvedValue(frame);
    const value = setup();
    expect(screen.getByText(DRAFT.kameraMenyala)).toBeInTheDocument();
    const shutter = screen.getByRole("button", { name: SCAN_CAPTURE.camera });
    await waitFor(() => expect(shutter).toBeEnabled());
    expect(document.querySelector("video")).toBeVisible();
    await userEvent.click(shutter);
    expect(value.select).toHaveBeenCalledWith(frame);
  });

  test("izin ditolak memberi petunjuk dan kembali ke kamera bawaan HP", async () => {
    mockCamera(async () => { throw new DOMException("uji", "NotAllowedError"); });
    setup();
    expect(await screen.findByText(DRAFT.kameraDitolak)).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByRole("button", { name: SCAN_CAPTURE.camera })).toBeEnabled();
  });

  test("sebelum persetujuan scan, kamera tidak diminta", () => {
    mockCamera(async () => { throw new Error("tidak boleh dipanggil"); });
    setup(false);
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(document.querySelector("video")).toBeNull();
  });
});
