import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchHousehold, recordScanConsent, signOut, useSessionIdentity, type Household } from "@/features/auth";
import { AI_GAGAL, PERSETUJUAN_SCAN, SCAN_CAPTURE, SCAN_OUTCOME, SCAN_REQUEST, TOMBOL } from "@/shared/copy";
import { ApiError } from "@/shared/lib";
import { scanPackage } from "../api/scan";
import { scanResponseFixture, scanSlotFixture } from "../testing/scan-response-fixtures";
import { useScanRequest, SCAN_REQUEST_TIMEOUT_MS } from "../hooks/use-scan-request";
import { compressPhoto } from "../lib/compress-photo";
import { PHOTO_POLICY, PhotoError } from "../lib/photo-policy";
import { usePhotoCapture } from "../hooks/use-photo-capture";
import { SCAN_CONSENT_STORAGE_KEY } from "../lib/device-consent";
import { ScanScreen } from "./scan-screen";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push }) }));
vi.mock("@/features/auth", () => ({ fetchHousehold: vi.fn(), recordScanConsent: vi.fn(), useSessionIdentity: vi.fn(), signOut: vi.fn(), householdQueryKey: ["household"] }));
vi.mock("../lib/compress-photo", () => ({ compressPhoto: vi.fn() }));
vi.mock("../api/scan", () => ({ scanPackage: vi.fn() }));
const GET = vi.mocked(fetchHousehold); const POST = vi.mocked(recordScanConsent); const compress = vi.mocked(compressPhoto);
const scanPost = vi.mocked(scanPackage);
const NativeURL = URL; const revoke = vi.fn(); let nextUrl = 0;
const clients: QueryClient[] = [];
const household: Household = { dataConsentAt: "2026-11-12T00:00:00Z", scanConsentAt: "2026-11-12T00:01:00Z", outputMode: "teks", isDemo: false };
const prepared = () => ({ blob: new Blob(["jpeg-uji"], { type: "image/jpeg" }), width: 1000, height: 600 });
function setup(doseTarget?: string | string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const ui = (target = doseTarget) => <QueryClientProvider client={client}><ScanScreen doseTarget={target} /></QueryClientProvider>;
  const view = render(ui());
  return { ...view, client, ui, user: userEvent.setup() };
}
async function upload() {
  await waitFor(() => expect(screen.getByLabelText(SCAN_CAPTURE.upload)).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText(SCAN_CAPTURE.upload), { target: { files: [new File(["raw"], "nama-pribadi.jpg", { type: "image/jpeg" })] } });
  return screen.findByAltText(SCAN_CAPTURE.preview);
}
beforeEach(() => {
  GET.mockReset().mockResolvedValue(household); POST.mockReset().mockResolvedValue(household); compress.mockReset().mockResolvedValue(prepared());
  vi.mocked(useSessionIdentity).mockReturnValue("akun-a"); push.mockReset(); revoke.mockReset(); nextUrl = 0;
  localStorage.clear();
  scanPost.mockReset().mockResolvedValue(scanResponseFixture()); vi.mocked(signOut).mockReset();
  vi.stubGlobal("URL", class extends NativeURL { static createObjectURL() { return `blob:uji-${++nextUrl}`; } static revokeObjectURL = revoke; });
});
afterEach(() => { clients.forEach((client) => client.clear()); clients.length = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("persetujuan per HP dan akun", () => {
  test("HP baru tetap meminta #2 meskipun akun pernah setuju", async () => {
    const { user } = setup();
    const dialog = await screen.findByRole("dialog", { name: SCAN_CAPTURE.consentTitle });
    expect(dialog).toHaveAccessibleDescription(PERSETUJUAN_SCAN);
    expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: SCAN_CAPTURE.agree }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(POST).toHaveBeenCalledTimes(1); expect(localStorage.getItem(SCAN_CONSENT_STORAGE_KEY)).toBe("true");
    expect(screen.getByRole("heading", { name: TOMBOL.scanObat })).toHaveFocus();
  });
  test("flag perangkat tidak mengganti consent akun yang belum ada", async () => {
    localStorage.setItem(SCAN_CONSENT_STORAGE_KEY, "true"); GET.mockResolvedValue({ ...household, scanConsentAt: null });
    setup(); expect(await screen.findByRole("dialog")).toBeInTheDocument(); expect(POST).not.toHaveBeenCalled();
  });
  test("akun dan HP sudah setuju membuka capture tanpa POST baru", async () => {
    localStorage.setItem(SCAN_CONSENT_STORAGE_KEY, "true"); setup();
    await waitFor(() => expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeEnabled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(POST).not.toHaveBeenCalled();
  });
  test.each(["Batal", "Escape", "Tutup"])("%s membatalkan tanpa POST/local flag", async (action) => {
    const { user } = setup(); const dialog = await screen.findByRole("dialog");
    if (action === "Escape") await user.keyboard("{Escape}");
    else await user.click(within(dialog).getByRole("button", { name: action }));
    expect(push).toHaveBeenCalledWith("/"); expect(POST).not.toHaveBeenCalled(); expect(localStorage.getItem(SCAN_CONSENT_STORAGE_KEY)).toBeNull();
  });
  test("POST gagal tidak membuka capture atau menulis flag; percobaan perlu klik baru", async () => {
    POST.mockRejectedValue(new Error("rahasia-uji")); const { user } = setup(); const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: SCAN_CAPTURE.agree }));
    expect(await screen.findByText(SCAN_CAPTURE.consentFailed)).toBeInTheDocument();
    expect(localStorage.getItem(SCAN_CONSENT_STORAGE_KEY)).toBeNull(); expect(POST).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeDisabled(); expect(screen.queryByText("rahasia-uji")).not.toBeInTheDocument();
  });
  test("klik ganda dan Esc saat menyimpan tidak mengulang/menutup", async () => {
    let finish!: (value: Household) => void; POST.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { user } = setup(); const dialog = await screen.findByRole("dialog");
    await user.dblClick(within(dialog).getByRole("button", { name: SCAN_CAPTURE.agree })); await user.keyboard("{Escape}");
    expect(POST).toHaveBeenCalledTimes(1); expect(dialog).toBeInTheDocument(); expect(within(dialog).getByRole("button", { name: TOMBOL.batal })).toBeDisabled();
    await act(async () => { finish(household); });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  test("localStorage diblokir tidak membuat layar macet setelah persetujuan akun", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const { user } = setup(); await user.click(await screen.findByRole("button", { name: SCAN_CAPTURE.agree }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeEnabled();
  });
  test("GET gagal punya retry dan tidak membuka capture", async () => {
    GET.mockRejectedValue(new Error("failed")); const { user } = setup();
    expect(await screen.findByText(SCAN_CAPTURE.loadFailed)).toBeInTheDocument();
    GET.mockResolvedValue(household); await user.click(screen.getByRole("button", { name: SCAN_CAPTURE.retry }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
  test("keluar dari layar sebelum POST selesai tidak menyimpan flag perangkat", async () => {
    let finish!: (value: Household) => void; POST.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = setup(); await view.user.click(await screen.findByRole("button", { name: SCAN_CAPTURE.agree }));
    view.unmount(); await act(async () => { finish(household); });
    expect(localStorage.getItem(SCAN_CONSENT_STORAGE_KEY)).toBeNull();
  });
});

describe("foto sementara dan target scan", () => {
  beforeEach(() => { localStorage.setItem(SCAN_CONSENT_STORAGE_KEY, "true"); });
  test("foto siap tanpa upload ke AI, nama berkas tidak tampil/tersimpan pada cache", async () => {
    const { client } = setup(); const preview = await upload();
    expect(preview).toHaveAttribute("src", "blob:uji-1"); expect(screen.getByText(SCAN_CAPTURE.ready)).toBeInTheDocument();
    expect(screen.queryByText("nama-pribadi.jpg")).not.toBeInTheDocument();
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toMatch(/blob:|nama-pribadi|jpeg-uji/);
    expect(Object.keys(localStorage)).toEqual([SCAN_CONSENT_STORAGE_KEY]);
    expect(scanPost).not.toHaveBeenCalled();
  });
  test("mengganti dan meninggalkan layar melepaskan URL lama", async () => {
    const view = setup(); await upload();
    fireEvent.change(screen.getByLabelText(SCAN_CAPTURE.upload), { target: { files: [new File(["raw2"], "lain.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(screen.getByAltText(SCAN_CAPTURE.preview)).toHaveAttribute("src", "blob:uji-2"));
    expect(revoke).toHaveBeenCalledWith("blob:uji-1"); view.unmount(); expect(revoke).toHaveBeenCalledWith("blob:uji-2");
  });
  test("Foto ulang membuang foto dan membatalkan pemilihan tanpa mengirim apa pun", async () => {
    const { user } = setup(); await upload();
    await user.click(screen.getByRole("button", { name: SCAN_CAPTURE.retake }));
    expect(screen.queryByAltText(SCAN_CAPTURE.preview)).not.toBeInTheDocument(); expect(revoke).toHaveBeenCalledWith("blob:uji-1");
    expect(compress).toHaveBeenCalledTimes(1);
  });
  test("hasil yang baru selesai sesudah unmount tidak membuat preview URL", async () => {
    let finish!: (value: ReturnType<typeof prepared>) => void;
    compress.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = setup(); await waitFor(() => expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeEnabled());
    fireEvent.change(screen.getByLabelText(SCAN_CAPTURE.upload), { target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] } });
    view.unmount(); await act(async () => { finish(prepared()); });
    expect(nextUrl).toBe(0); expect(compress.mock.calls[0]?.[1].aborted).toBe(true);
  });
  test("timeout kompresi membatalkan decoder dan membuka jalan coba lagi", async () => {
    vi.useFakeTimers();
    try {
      compress.mockImplementation((_file, signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      }));
      const { result, unmount } = renderHook(() => usePhotoCapture());
      act(() => { void result.current.select(new File(["x"], "x.jpg", { type: "image/jpeg" })); });
      await act(async () => { await vi.advanceTimersByTimeAsync(PHOTO_POLICY.timeoutMs); });
      expect(result.current.processing).toBe(false); expect(result.current.error).toBe("compression"); expect(result.current.photo).toBeNull();
      unmount();
    } finally { vi.useRealTimers(); }
  });
  test("hasil kompresi lama yang selesai belakangan tidak mengganti pilihan baru", async () => {
    let first!: (value: ReturnType<typeof prepared>) => void;
    compress.mockReturnValueOnce(new Promise((resolve) => { first = resolve; }));
    setup(); await waitFor(() => expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeEnabled());
    const input = screen.getByLabelText(SCAN_CAPTURE.upload);
    fireEvent.change(input, { target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] } });
    // Event terlambat/native dapat tiba meskipun picker sedang dinonaktifkan.
    fireEvent.change(input, { target: { files: [new File(["b"], "b.jpg", { type: "image/jpeg" })] } });
    await screen.findByAltText(SCAN_CAPTURE.preview);
    await act(async () => { first(prepared()); });
    expect(screen.getByAltText(SCAN_CAPTURE.preview)).toHaveAttribute("src", "blob:uji-1");
    expect(compress.mock.calls[0]?.[1].aborted).toBe(true);
  });
  test.each([["unsupported", SCAN_CAPTURE.unsupported], ["too_large", SCAN_CAPTURE.tooLarge], ["unreadable", SCAN_CAPTURE.unreadable], ["compression", SCAN_CAPTURE.compressionFailed]] as const)("gagal %s memberi jalan ulang tanpa foto lama", async (reason, message) => {
    compress.mockRejectedValue(new PhotoError(reason)); setup();
    await waitFor(() => expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeEnabled());
    fireEvent.change(screen.getByLabelText(SCAN_CAPTURE.upload), { target: { files: [new File(["x"], "x.jpg", { type: "image/jpeg" })] } });
    expect(await screen.findByText(message)).toBeInTheDocument(); expect(screen.queryByAltText(SCAN_CAPTURE.preview)).not.toBeInTheDocument();
  });
  test("kamera memakai capture environment; unggah biasa tidak memaksa kamera", async () => {
    setup(); await waitFor(() => expect(screen.getByLabelText(SCAN_CAPTURE.upload)).toBeEnabled());
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs[0]).toHaveAttribute("capture", "environment"); expect(inputs[0]).toHaveAttribute("accept", "image/*");
    expect(inputs[1]).not.toHaveAttribute("capture");
    expect(screen.getByText("Ketuk untuk memotret")).toBeVisible();
  });
  test("target berubah membersihkan foto dan menampilkan tanggal/jam eksplisit", async () => {
    const view = setup(); await upload(); view.rerender(view.ui("obat-a:20261112:0700"));
    await waitFor(() => expect(screen.queryByAltText(SCAN_CAPTURE.preview)).not.toBeInTheDocument());
    expect(revoke).toHaveBeenCalledWith("blob:uji-1"); expect(screen.getByText(/07.00 WIB/)).toBeInTheDocument();
  });
  test("akun berubah membuang foto sebelum pemeriksaan consent akun baru", async () => {
    const view = setup(); await upload(); vi.mocked(useSessionIdentity).mockReturnValue("akun-b"); GET.mockResolvedValue({ ...household, scanConsentAt: null });
    view.rerender(view.ui()); expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByAltText(SCAN_CAPTURE.preview)).not.toBeInTheDocument(); expect(revoke).toHaveBeenCalledWith("blob:uji-1");
  });
  test("target rusak tidak menjadi scan generik", async () => {
    setup("obat-a%3A20261112%3A0700"); expect(screen.getByText(SCAN_CAPTURE.invalidTarget)).toBeInTheDocument(); expect(GET).not.toHaveBeenCalled();
  });
  test("consent dan capture lolos axe", async () => {
    localStorage.clear(); const { user } = setup(); const dialog = await screen.findByRole("dialog");
    expect((await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: SCAN_CAPTURE.agree }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect((await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations).toEqual([]);
  });
});

describe("pengiriman scan tanpa pencatatan dosis", () => {
  beforeEach(() => { localStorage.setItem(SCAN_CONSENT_STORAGE_KEY, "true"); });
  test.each([undefined, scanSlotFixture.slotId])("jalur %s mengirim hanya sesudah Gunakan Foto Ini dan membuang preview", async (target) => {
    const view = setup(target); await upload();
    expect(scanPost).not.toHaveBeenCalled(); await view.user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    expect(scanPost).toHaveBeenCalledTimes(1);
    expect(scanPost.mock.calls[0]?.[0].slotId).toBe(target);
    expect(scanPost.mock.calls[0]?.[0].blob.type).toBe("image/jpeg");
    expect(await screen.findByText(SCAN_OUTCOME.matched)).toBeInTheDocument();
    expect(screen.queryByAltText(SCAN_CAPTURE.preview)).not.toBeInTheDocument(); expect(revoke).toHaveBeenCalledWith("blob:uji-1");
    expect(screen.queryByRole("button", { name: TOMBOL.sudahSayaMinum })).not.toBeInTheDocument();
    const cache = JSON.stringify([...view.client.getQueryCache().getAll().map((query) => query.state.data), ...view.client.getMutationCache().getAll().map((mutation) => mutation.state)]);
    expect(cache).not.toMatch(/blob:|jpeg-uji|token-scan-uji|nama-pribadi/);
  });
  test("klik ganda hanya satu permintaan; Batal menolak hasil lama dan memulihkan fokus", async () => {
    let finish!: (value: ReturnType<typeof scanResponseFixture>) => void;
    scanPost.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { user } = setup(); await upload(); await user.dblClick(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    expect(await screen.findByRole("heading", { name: SCAN_REQUEST.reading })).toHaveFocus(); expect(scanPost).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: TOMBOL.batal }));
    expect(await screen.findByText(SCAN_REQUEST.cancelled)).toBeInTheDocument(); expect(scanPost.mock.calls[0]?.[0].signal.aborted).toBe(true);
    await act(async () => { finish(scanResponseFixture()); });
    expect(screen.queryByText(SCAN_OUTCOME.matched)).not.toBeInTheDocument(); expect(screen.getByRole("heading", { name: TOMBOL.scanObat })).toHaveFocus();
  });
  test.each(["NETWORK_ERROR", "TIMEOUT", "INVALID_RESPONSE", "AI_QUOTA_EXCEEDED", "AI_UNAVAILABLE"])("galat %s memakai #12 persis, tanpa retry otomatis", async (code) => {
    scanPost.mockRejectedValue(new ApiError(code, null, "detail-uji-yang-tidak-boleh-tampil"));
    const { user } = setup(); await upload(); await user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    expect(await screen.findByText(AI_GAGAL)).toBeInTheDocument(); expect(scanPost).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("detail-uji-yang-tidak-boleh-tampil")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: SCAN_REQUEST.again }));
    expect(screen.getByRole("heading", { name: TOMBOL.scanObat })).toHaveFocus(); expect(scanPost).toHaveBeenCalledTimes(1);
  });
  test("401 keluar melalui penanganan auth; 404 tidak dialihkan ke scan generik", async () => {
    scanPost.mockRejectedValueOnce(new ApiError("UNAUTHENTICATED", 401, "uji"));
    const view = setup(); await upload(); await view.user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    expect(await screen.findByText(SCAN_REQUEST.session)).toBeInTheDocument(); expect(signOut).toHaveBeenCalledTimes(1);
    view.unmount(); scanPost.mockRejectedValueOnce(new ApiError("NOT_FOUND", 404, "uji"));
    const next = setup(scanSlotFixture.slotId); await upload(); await next.user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    expect(await screen.findByText(SCAN_REQUEST.target)).toBeInTheDocument(); expect(scanPost.mock.calls[1]?.[0].slotId).toBe(scanSlotFixture.slotId);
    expect(screen.queryByRole("button", { name: SCAN_REQUEST.again })).not.toBeInTheDocument();
  });
  test("403 consent memuat ulang persetujuan akun dan tidak mengulang scan", async () => {
    scanPost.mockRejectedValue(new ApiError("CONSENT_REQUIRED", 403, "uji"));
    const { user } = setup(); await upload(); GET.mockResolvedValue({ ...household, scanConsentAt: null });
    await user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    expect(await screen.findByRole("dialog", { name: SCAN_CAPTURE.consentTitle })).toBeInTheDocument(); expect(scanPost).toHaveBeenCalledTimes(1);
  });
  test("ganti akun saat pending membatalkan request dan mengabaikan hasil untuk akun lama", async () => {
    let finish!: (value: ReturnType<typeof scanResponseFixture>) => void;
    scanPost.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = setup(); await upload(); await view.user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    vi.mocked(useSessionIdentity).mockReturnValue("akun-b"); view.rerender(view.ui());
    await waitFor(() => expect(screen.getByRole("heading", { name: TOMBOL.scanObat })).toBeInTheDocument());
    expect(scanPost.mock.calls[0]?.[0].signal.aborted).toBe(true);
    await act(async () => { finish(scanResponseFixture()); });
    expect(screen.queryByText(SCAN_OUTCOME.matched)).not.toBeInTheDocument();
  });
  test("deadline total menyelesaikan UI meskipun transport mengabaikan abort", async () => {
    vi.useFakeTimers();
    try {
      scanPost.mockReturnValue(new Promise(() => {}));
      const { result, unmount } = renderHook(() => useScanRequest());
      act(() => { void result.current.start({ blob: prepared().blob }); });
      expect(result.current.state.phase).toBe("pending");
      await act(async () => { await vi.advanceTimersByTimeAsync(SCAN_REQUEST_TIMEOUT_MS); });
      expect(result.current.state).toEqual({ phase: "error", reason: "unavailable" }); expect(scanPost.mock.calls[0]?.[0].signal.aborted).toBe(true);
      unmount();
    } finally { vi.useRealTimers(); }
  });
  test("hasil request yang dibatalkan tidak mengganti hasil request berikutnya", async () => {
    let first!: (value: ReturnType<typeof scanResponseFixture>) => void;
    scanPost.mockReturnValueOnce(new Promise((resolve) => { first = resolve; }));
    scanPost.mockResolvedValueOnce(scanResponseFixture("tidak_terbaca"));
    const { result, unmount } = renderHook(() => useScanRequest());
    act(() => { void result.current.start({ blob: prepared().blob }); });
    act(() => { result.current.cancel(); });
    await act(async () => { await result.current.start({ blob: prepared().blob }); });
    await act(async () => { first(scanResponseFixture()); });
    expect(result.current.state).toMatchObject({ phase: "complete", result: { outcome: "tidak_terbaca" } });
    expect(scanPost).toHaveBeenCalledTimes(2); unmount();
  });
  test("loading, galat #12 dan hasil cocok lolos axe", async () => {
    let finish!: (value: ReturnType<typeof scanResponseFixture>) => void;
    scanPost.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const { user } = setup(); await upload(); await user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto }));
    const rules = { "color-contrast": { enabled: false }, region: { enabled: false } };
    expect((await axe.run(document.body, { rules })).violations).toEqual([]);
    await act(async () => { finish(scanResponseFixture()); });
    expect((await axe.run(document.body, { rules })).violations).toEqual([]);
    await user.click(screen.getByRole("button", { name: SCAN_REQUEST.again }));
    scanPost.mockRejectedValue(new ApiError("AI_UNAVAILABLE", 503, "uji")); await upload();
    await user.click(screen.getByRole("button", { name: SCAN_REQUEST.usePhoto })); await screen.findByText(AI_GAGAL);
    expect((await axe.run(document.body, { rules })).violations).toEqual([]);
  });
});
