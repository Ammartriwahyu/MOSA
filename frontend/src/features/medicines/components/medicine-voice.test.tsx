import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AI_GAGAL, DRAFT, KONFIRMASI_SIMPAN_OBAT, OBAT, TOMBOL, UBAH_OBAT } from "@/shared/copy";
import { installSpeechEngine, type TestSpeechEngine } from "@/shared/testing/speech-engine";
import type { Medicine } from "../api/medicines";
import { useMedicine } from "../hooks/use-medicines";
import { MedicineDetailScreen } from "./medicine-detail-screen";
import { MedicineReviewDialog, type MedicineReview } from "./medicine-review-dialog";

vi.mock("next/navigation", () => ({ usePathname: () => "/medicines/uji", useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../hooks/use-medicines", () => ({ useMedicine: vi.fn(), useDeactivateMedicine: () => ({ isPending: false, mutateAsync: vi.fn() }) }));
const medicine: Medicine = { id: "uji", name: "Obat Fiktif", strength: "5 mg", purpose: "Kegunaan uji", doseAmount: "1 tablet", usageRule: "Sesudah makan", warnings: "Peringatan uji", notes: "Catatan uji", intakeTimes: ["07:00"], labelSource: "keluarga", explanationOrigin: "ai_dikonfirmasi", explanation: "Penjelasan yang diperiksa.\nBaris kedua tetap sama.", createdAt: "2026-11-11T00:00:00Z" };
const review: MedicineReview = { input: { ...medicine }, reviewed: { explanation: "Penjelasan yang diperiksa.\nBaris kedua tetap sama.", explanationOrigin: "ai_dikonfirmasi" } };
let engine: TestSpeechEngine;
beforeEach(() => { engine = installSpeechEngine(); vi.mocked(useMedicine).mockReturnValue({ isPending: false, isError: false, data: medicine } as ReturnType<typeof useMedicine>); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function expectVisibleReading(text: string) {

  for (const line of text.split("\n")) expect(document.body.textContent).toContain(line);
}
test("pop-up membacakan pratinjau persis tanpa menganggap sudah diperiksa atau menyimpan; unmount menghentikan", async () => {
  const onConfirm = vi.fn(); const onEdit = vi.fn();
  const view = render(<MedicineReviewDialog review={review} saving={false} error={null} onConfirm={onConfirm} onEdit={onEdit} returnFocusRef={createRef()} />);
  expect(engine.speak).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan }));
  const text = engine.speak.mock.calls[0]![0].text;
  expect(text).toContain(KONFIRMASI_SIMPAN_OBAT); expect(text).toContain(medicine.explanation); expect(text).not.toContain(OBAT.penjelasanDiperiksa); expectVisibleReading(text);
  expect(onConfirm).not.toHaveBeenCalled(); expect(onEdit).not.toHaveBeenCalled();
  const calls = engine.cancel.mock.calls.length; view.unmount(); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls);
});
test("pop-up fallback membacakan D-c dan data asli tanpa AI; mulai simpan membatalkan", async () => {
  const props = { review: { ...review, reviewed: { explanation: null, explanationOrigin: "teks_pengisi" as const } }, saving: false, error: null, onConfirm: vi.fn(), onEdit: vi.fn(), returnFocusRef: createRef<HTMLElement>() };
  const view = render(<MedicineReviewDialog {...props} />);
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); const text = engine.speak.mock.calls[0]![0].text;
  expect(text).toContain(AI_GAGAL); expect(text).toContain(DRAFT.penjelasanBelumTersedia); expect(text).toContain(medicine.warnings); expect(text).not.toContain(medicine.explanation); expectVisibleReading(text);
  const calls = engine.cancel.mock.calls.length; view.rerender(<MedicineReviewDialog {...props} saving />); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls); expect(screen.getByRole("button", { name: TOMBOL.bacakan })).toBeDisabled();
});
test("detail mempertahankan teks diperiksa dan asli; dialog hapus menghentikan tanpa memulai lagi saat Batal", async () => {
  render(<MedicineDetailScreen id="uji" />); expect(engine.speak).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); const text = engine.speak.mock.calls[0]![0].text;
  expect(text).toContain(medicine.explanation); expect(text).toContain(medicine.usageRule); expect(text).toContain(OBAT.bukanSaranMedis); expectVisibleReading(text);
  const calls = engine.cancel.mock.calls.length; await userEvent.click(screen.getByRole("button", { name: UBAH_OBAT.hapus })); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls);
  await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: TOMBOL.batal })); expect(engine.speak).toHaveBeenCalledTimes(1);
});
test("detail menolak AI yang belum diperiksa dan tetap dapat dibaca saat native API tidak ada", async () => {
  const data = { ...medicine, explanationOrigin: "teks_pengisi" as const, explanation: "Rahasia AI belum diperiksa" };
  vi.mocked(useMedicine).mockReturnValue({ isPending: false, isError: false, data } as ReturnType<typeof useMedicine>);
  const view = render(<MedicineDetailScreen id="uji" />); await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan }));
  expect(engine.speak.mock.calls[0]![0].text).toContain(DRAFT.penjelasanBelumTersedia); expect(engine.speak.mock.calls[0]![0].text).not.toContain(data.explanation);
  view.unmount(); vi.stubGlobal("speechSynthesis", undefined); render(<MedicineDetailScreen id="uji" />);
  expect(screen.getByText(DRAFT.suaraTidakTersedia)).toBeInTheDocument(); expect(screen.getByText(medicine.usageRule)).toBeInTheDocument(); expect(screen.getByRole("button", { name: TOMBOL.bacakan })).toBeDisabled();
});
