import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { confirmVerifiedDose, getTodaysDoses, dosesQueryKey, type DoseConfirmation } from "@/features/doses";
import { ApiError } from "@/shared/lib";
import { KONFIRMASI_MINUM, PREFERENSI, SCAN_CONFIRM, TOMBOL } from "@/shared/copy";
import { scanMedicineFixture, scanResponseFixture, scanSlotFixture } from "../testing/scan-response-fixtures";
import { useScanConfirmation } from "../hooks/use-scan-confirmation";
import { renderHook } from "@testing-library/react";
import { ScanResultFlow } from "./scan-result-flow";
import { installSpeechEngine } from "@/shared/testing/speech-engine";

const { push, savePreference } = vi.hoisted(() => ({ push: vi.fn(), savePreference: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push }) }));
vi.mock("@/features/doses", () => ({ confirmVerifiedDose: vi.fn(), getTodaysDoses: vi.fn(), dosesQueryKey: ["doses", "today"] }));
vi.mock("@/features/preferences", () => ({ OutputPreferenceChoice: ({ onSaved }: { onSaved: () => void }) => <button onClick={async () => { await savePreference(); onSaved(); }}>{PREFERENSI.simpanLihatHasil}</button> }));
const post = vi.mocked(confirmVerifiedDose); const get = vi.mocked(getTodaysDoses);
const receipt: DoseConfirmation = { status: "sudah", serverTime: "2026-11-12T00:30:00Z", confirmation: { id: "catatan-a", ...scanSlotFixture, level: "scan_terverifikasi", confirmedAt: "2026-11-12T00:30:00Z" } };
function schedule(): Awaited<ReturnType<typeof getTodaysDoses>> { return { date: "2026-11-12", serverTime: receipt.serverTime, summary: { confirmed: 0, total: 1 }, medicines: [], carryoverDoses: [], earlyDoses: [], doses: [{ ...scanSlotFixture, medicine: scanMedicineFixture, status: "jatuh_tempo" as const, period: "pagi" as const, confirmation: null }] }; }
const clients: QueryClient[] = [];
function client() { const value = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(value); return value; }
function setup(outputMode: "teks" | "suara" | null = "teks", result = scanResponseFixture()) {
  const cache = client(); const onAgain = vi.fn();
  const view = render(<QueryClientProvider client={cache}><ScanResultFlow result={result} userId="akun-a" outputMode={outputMode} onAgain={onAgain} /></QueryClientProvider>);
  return { ...view, cache, onAgain, user: userEvent.setup() };
}
async function open() { await userEvent.click(screen.getByRole("button", { name: SCAN_CONFIRM.continue })); await waitFor(() => expect(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeEnabled()); }
beforeEach(() => { vi.clearAllMocks(); post.mockResolvedValue(receipt); get.mockResolvedValue(schedule()); savePreference.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); clients.splice(0).forEach((row) => row.clear()); vi.useRealTimers(); vi.unstubAllGlobals(); });

test.each(["teks", "suara"] as const)("mode %s tidak autoplay; dialog konfirmasi menghentikan bacaan tanpa POST", async (mode) => {
  const engine = installSpeechEngine(); const { user } = setup(mode); expect(engine.speak).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: TOMBOL.bacakan })); expect(engine.speak).toHaveBeenCalledTimes(1);
  const calls = engine.cancel.mock.calls.length; await open(); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls); expect(post).not.toHaveBeenCalled();
});

test("Lanjut membuka #5 tanpa POST; klik ganda hanya menyimpan slot/token yang dipilih satu kali", async () => {
  let finish!: (value: DoseConfirmation) => void; post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const { user, cache } = setup(); const cancel = vi.spyOn(cache, "cancelQueries"); const invalidate = vi.spyOn(cache, "invalidateQueries");
  await open(); expect(post).not.toHaveBeenCalled(); expect(screen.getByRole("dialog", { name: KONFIRMASI_MINUM })).toHaveFocus();
  await user.dblClick(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum })); expect(post).toHaveBeenCalledTimes(1);
  expect(post.mock.calls[0]?.[0]).toMatchObject({ slotId: scanSlotFixture.slotId, scanToken: "token-scan-uji-tidak-untuk-produksi" });
  expect(screen.getByRole("button", { name: TOMBOL.nantiDulu })).toBeDisabled(); await user.keyboard("{Escape}"); expect(screen.getByRole("dialog")).toBeInTheDocument();
  await act(async () => { finish(receipt); });
  expect(await screen.findByRole("heading", { name: SCAN_CONFIRM.saved })).toHaveFocus(); expect(screen.getByText("Sudah, terverifikasi scan")).toBeInTheDocument();
  expect(cancel).toHaveBeenCalledWith({ queryKey: dosesQueryKey }); expect(invalidate).toHaveBeenCalledWith({ queryKey: dosesQueryKey });
  expect(JSON.stringify(cache.getMutationCache().getAll())).not.toContain("token-scan-uji"); expect(cache.getMutationCache().getAll()).toHaveLength(0);
});
test.each(["button", "escape", "close"])("Nanti dulu/%s kembali ke jadwal, membuang hasil, tanpa POST", async (method) => {
  const { user, onAgain } = setup(); await open();
  if (method === "button") await user.click(screen.getByRole("button", { name: TOMBOL.nantiDulu }));
  else if (method === "escape") await user.keyboard("{Escape}");
  else await user.click(screen.getByRole("button", { name: "Tutup" }));
  expect(post).not.toHaveBeenCalled(); expect(push).toHaveBeenCalledWith("/"); expect(onAgain).toHaveBeenCalledTimes(1);
});
test.each(["SCAN_TOKEN_INVALID", "DOSE_MISSED", "DOSE_NOT_DUE", "NOT_FOUND", "DOSE_ALREADY_CONFIRMED", "NETWORK_ERROR", "INVALID_RESPONSE"])("galat %s tidak menaikkan level atau mengulang token", async (code) => {
  post.mockRejectedValue(new ApiError(code, null, "detail-rahasia-uji")); const { user } = setup(); await open(); await user.click(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum }));
  const expected = code === "SCAN_TOKEN_INVALID" ? SCAN_CONFIRM.expired : code === "DOSE_ALREADY_CONFIRMED" ? SCAN_CONFIRM.already : ["DOSE_MISSED", "DOSE_NOT_DUE", "NOT_FOUND"].includes(code) ? SCAN_CONFIRM.changed : SCAN_CONFIRM.uncertain;
  expect(await screen.findByText(expected)).toBeInTheDocument(); expect(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeDisabled();
  expect(screen.queryByText("detail-rahasia-uji")).not.toBeInTheDocument(); expect(screen.queryByText("Sudah, terverifikasi scan")).not.toBeInTheDocument(); expect(post).toHaveBeenCalledTimes(1);
});
test("jadwal/detail berubah sebelum dialog: cek segar menutup konfirmasi", async () => {
  const changed = schedule(); changed.doses[0]!.medicine = { ...scanMedicineFixture, doseAmount: "2 tablet" };
  get.mockResolvedValue(changed); const { user } = setup(); await user.click(screen.getByRole("button", { name: SCAN_CONFIRM.continue }));
  expect(await screen.findByText(SCAN_CONFIRM.changed)).toBeInTheDocument(); expect(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeDisabled(); expect(post).not.toHaveBeenCalled();
});
test("overlap wajib memilih satu slot, token 08.00 tidak diganti token 07.00", async () => {
  const result = scanResponseFixture(); if (result.outcome !== "bisa_konfirmasi") throw new Error("fixture");
  const second = { ...result.slots[0]!, slotId: "obat-a:20261112:0800", scheduledTime: "08:00", scheduledAt: "2026-11-12T01:00:00Z", scanToken: "token-kedua-uji" };
  const fresh = schedule(); fresh.doses.push({ ...fresh.doses[0]!, ...second }); get.mockResolvedValue(fresh);
  const { user } = setup("teks", { ...result, slots: [...result.slots, second] }); expect(screen.getByRole("button", { name: SCAN_CONFIRM.continue })).toBeDisabled();
  await user.click(screen.getByRole("radio", { name: "12 November 2026 · 08.00 WIB" })); await open(); await user.click(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum }));
  expect(post.mock.calls[0]?.[0]).toMatchObject({ slotId: second.slotId, scanToken: second.scanToken });
});
test("pilihan output pertama tetap lokal; hanya setelah tersimpan hasil ditampilkan", async () => {
  const { user } = setup(null); expect(screen.queryByRole("button", { name: SCAN_CONFIRM.continue })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: PREFERENSI.simpanLihatHasil }));
  expect(await screen.findByRole("button", { name: SCAN_CONFIRM.continue })).toBeInTheDocument(); expect(push).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
});
test("hasil noncocok tidak meminta preferensi atau membuka konfirmasi", () => {
  setup(null, scanResponseFixture("kekuatan_beda")); expect(screen.queryByRole("button", { name: PREFERENSI.simpanLihatHasil })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: SCAN_CONFIRM.continue })).not.toBeInTheDocument();
});
test("deadline token dan POST tetap berlaku saat transport tidak kooperatif; hasil terlambat diabaikan", async () => {
  vi.useFakeTimers(); const cache = client();
  const { result, unmount } = renderHook(() => useScanConfirmation(scanResponseFixture()), { wrapper: ({ children }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider> });
  const value = scanResponseFixture(); if (value.outcome !== "bisa_konfirmasi") throw new Error("fixture");
  await act(async () => { await result.current.open(value.slots[0]!, document.createElement("button")); });
  let finish!: (value: DoseConfirmation) => void; post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  act(() => { void result.current.submit(); }); await act(async () => { await vi.advanceTimersByTimeAsync(25_000); });
  expect(result.current.state).toMatchObject({ phase: "error", reason: "uncertain" }); expect(post.mock.calls[0]?.[1].aborted).toBe(true);
  await act(async () => { finish(receipt); }); expect(result.current.state.phase).toBe("error"); unmount();
});
test("token kedaluwarsa selama pilihan output memblokir Lanjut tanpa POST", async () => {
  vi.useFakeTimers(); const cache = client(); const value = scanResponseFixture();
  const { result, unmount } = renderHook(() => useScanConfirmation(value), { wrapper: ({ children }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider> });
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); }); expect(result.current.expired).toBe(true);
  if (value.outcome !== "bisa_konfirmasi") throw new Error("fixture");
  await act(async () => { await result.current.open(value.slots[0]!, document.createElement("button")); }); expect(result.current.selected).toBeNull(); expect(post).not.toHaveBeenCalled(); unmount();
});
test("pemeriksaan jadwal yang tidak selesai berhenti setelah 25 detik tanpa mengirim konfirmasi", async () => {
  vi.useFakeTimers(); get.mockReturnValue(new Promise(() => {})); const cache = client(); const value = scanResponseFixture();
  const { result, unmount } = renderHook(() => useScanConfirmation(value), { wrapper: ({ children }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider> });
  if (value.outcome !== "bisa_konfirmasi") throw new Error("fixture");
  act(() => { void result.current.open(value.slots[0]!, document.createElement("button")); });
  await act(async () => { await vi.advanceTimersByTimeAsync(25_000); });
  expect(result.current.checking).toBe(false); expect(result.current.state).toMatchObject({ phase: "error", reason: "uncertain" });
  expect(get.mock.calls[0]?.[0]?.aborted).toBe(true); expect(post).not.toHaveBeenCalled(); unmount();
});
test("receipt sukses tetap sah ketika pemuatan ulang jadwal belum selesai melewati deadline", async () => {
  vi.useFakeTimers(); const cache = client(); const value = scanResponseFixture();
  vi.spyOn(cache, "invalidateQueries").mockImplementation(() => new Promise(() => {}));
  const { result, unmount } = renderHook(() => useScanConfirmation(value), { wrapper: ({ children }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider> });
  if (value.outcome !== "bisa_konfirmasi") throw new Error("fixture");
  await act(async () => { await result.current.open(value.slots[0]!, document.createElement("button")); });
  act(() => { void result.current.submit(); }); await act(async () => { await vi.advanceTimersByTimeAsync(25_000); });
  expect(result.current.state).toMatchObject({ phase: "saved", receipt }); expect(post).toHaveBeenCalledTimes(1); unmount();
});
test("unmount membatalkan POST dan mengabaikan respons akun lama", async () => {
  let finish!: (value: DoseConfirmation) => void; post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const view = setup(); await open(); await view.user.click(screen.getByRole("button", { name: TOMBOL.sudahSayaMinum })); view.unmount();
  expect(post.mock.calls[0]?.[1].aborted).toBe(true); await act(async () => { finish(receipt); }); expect(push).not.toHaveBeenCalled();
});
test("dialog #5 lolos axe dan fokus bukan tombol konfirmasi", async () => {
  setup(); await open(); const dialog = screen.getByRole("dialog"); expect(within(dialog).getByText(KONFIRMASI_MINUM)).toBeInTheDocument();
  expect((await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
});
