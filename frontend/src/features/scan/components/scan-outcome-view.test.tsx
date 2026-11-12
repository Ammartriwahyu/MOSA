import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DRAFT, NAMA_BELUM_TERLIHAT, OBAT, OBAT_BELUM_TERDAFTAR, SCAN_OUTCOME, TOMBOL, jadwalBerikutnya } from "@/shared/copy";
import { scanOutcomeMessages } from "../lib/scan-outcome-message";
import { scanResponseSchema } from "../schemas/scan-response";
import { scanMedicineFixture, scanResponseFixture, scanSlotFixture } from "../testing/scan-response-fixtures";
import { ScanOutcomeView } from "./scan-outcome-view";

afterEach(cleanup);
function setup(result = scanResponseFixture()) {
  const onAgain = vi.fn(); const view = render(<ScanOutcomeView result={result} onAgain={onAgain} />);
  return { ...view, onAgain, user: userEvent.setup() };
}
const nextDose = { ...scanSlotFixture, slotId: "obat-a:20261113:0700", scheduledAt: "2026-11-13T00:00:00Z", scheduledDate: "2026-11-13",
  tanggal: "besok", kelompok: "pagi", jam: "07:00" };

describe("delapan hasil scan", () => {
  test.each(["tidak_terbaca", "tidak_terdaftar", "kekuatan_tidak_terbaca", "kekuatan_beda", "dosis_sudah_tercatat", "bisa_konfirmasi", "tunggu_dulu", "hanya_info"] as const)("hasil %s tampil tanpa pencatatan atau token di DOM", async (outcome) => {
    const result = scanResponseFixture(outcome); const { container } = setup(result);
    const slotId = outcome === "bisa_konfirmasi" ? scanSlotFixture.slotId : null;
    for (const message of scanOutcomeMessages(result, slotId)) expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(screen.queryByRole("button", { name: TOMBOL.sudahSayaMinum })).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/token-scan-uji|scanToken|expiresAt|householdId|\/confirm/);
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations).toEqual([]);
  });
  test("#9 dan #8 tetap baku; obat tidak terdaftar membuka formulir kosong tanpa tebakan AI", () => {
    const view = setup(scanResponseFixture("tidak_terbaca")); expect(screen.getByText(NAMA_BELUM_TERLIHAT)).toBeInTheDocument(); view.unmount();
    setup(scanResponseFixture("tidak_terdaftar")); expect(screen.getByText(OBAT_BELUM_TERDAFTAR)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.tambahObat })).toHaveAttribute("href", "/medicines/new");
    expect(screen.queryByText(scanMedicineFixture.name)).not.toBeInTheDocument();
  });
  test("#4 persis untuk slot tunggal, dengan tanggal asal dan sumber", () => {
    setup(); expect(screen.getByText("Obat sudah sesuai. Ini Obat Uji 5 mg untuk jadwal pukul 07.00. Minum 1 tablet sesudah makan.")).toBeInTheDocument();
    expect(screen.getByText("12 November 2026 · 07.00 WIB")).toBeInTheDocument(); expect(screen.getByText("Diisi keluarga")).toBeInTheDocument();
    expect(screen.getByText(SCAN_OUTCOME.noNewDose)).toBeInTheDocument();
  });
  test("slot bertumpuk tidak dipilih otomatis; memilih satu hanya mengganti pesan untuk slot itu", async () => {
    const result = scanResponseFixture();
    if (result.outcome !== "bisa_konfirmasi") throw new Error("Fixture tidak sesuai");
    const second = { ...result.slots[0]!, slotId: "obat-a:20261112:0800", scheduledTime: "08:00", scheduledAt: "2026-11-12T01:00:00Z" };
    const { user } = setup(scanResponseSchema.parse({ ...result, slots: [...result.slots, second] }));
    expect(screen.getByText(SCAN_OUTCOME.chooseSlotHint)).toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked();
    await user.click(screen.getByRole("radio", { name: "12 November 2026 · 08.00 WIB" }));
    expect(screen.getByText("Obat sudah sesuai. Ini Obat Uji 5 mg untuk jadwal pukul 08.00. Minum 1 tablet sesudah makan.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "12 November 2026 · 07.00 WIB" })).not.toBeChecked();
  });
  test("#7 membandingkan setiap kandidat kekuatan tanpa menambahkan larangan medis", () => {
    setup(scanResponseSchema.parse({ ...scanResponseFixture("kekuatan_beda"), medicines: [scanMedicineFixture, { ...scanMedicineFixture, id: "obat-b", strength: "20 mg" }] }));
    expect(screen.getByText("Hati-hati. Obat ini Obat Uji 10 mg, sedangkan yang terdaftar Obat Uji 5 mg. Tanyakan ke apoteker sebelum diminum.")).toBeInTheDocument();
    expect(screen.getByText("Hati-hati. Obat ini Obat Uji 10 mg, sedangkan yang terdaftar Obat Uji 20 mg. Tanyakan ke apoteker sebelum diminum.")).toBeInTheDocument();
    expect(screen.queryByText(/Jangan diminum dulu/)).not.toBeInTheDocument();
  });
  test("kekuatan belum terbaca memakai D-b tanpa mengklaim obat cocok", () => {
    setup(scanResponseFixture("kekuatan_tidak_terbaca")); expect(screen.getByText(DRAFT.kekuatanBelumTerlihat)).toBeInTheDocument();
    expect(screen.queryByText(SCAN_OUTCOME.matched)).not.toBeInTheDocument();
  });
  test("#6 menyebut setiap obat jatuh tempo sekali, tetapi seluruh tanggal/jam tetap terpisah", () => {
    const result = scanResponseFixture("tunggu_dulu"); if (result.outcome !== "tunggu_dulu") throw new Error("Fixture tidak sesuai");
    const second = { ...result.otherDueSlots[0]!, slotId: "obat-b:20261112:0800", scheduledTime: "08:00", scheduledAt: "2026-11-12T01:00:00Z" };
    const other = { ...second, slotId: "obat-c:20261112:0800", medicineId: "obat-c", medicine: { ...scanMedicineFixture, id: "obat-c", name: "Obat Uji Merah" } };
    setup(scanResponseSchema.parse({ ...result, nextDose, otherDueSlots: [...result.otherDueSlots, second, other] }));
    expect(screen.getByText("Tunggu dulu. Ini Obat Uji 5 mg untuk jadwal pukul 07.00. Obat untuk sekarang adalah Obat Uji Hijau 5 mg dan Obat Uji Merah 5 mg.")).toBeInTheDocument();
    expect(screen.getAllByText("12 November 2026 · 08.00 WIB")).toHaveLength(2);
  });
  test("jadwal berikutnya null pada tunggu_dulu tidak mengarang jam", () => {
    setup(scanResponseFixture("tunggu_dulu")); expect(screen.getByText("Tunggu dulu. Ini Obat Uji 5 mg. Obat untuk sekarang adalah Obat Uji Hijau 5 mg.")).toBeInTheDocument();
    expect(screen.queryByText(/Ini Obat Uji 5 mg untuk jadwal pukul/)).not.toBeInTheDocument();
  });
  test("sudah tercatat tidak menebak metode atau jam pencatatan dan membedakan jadwal besok", () => {
    setup(scanResponseSchema.parse({ ...scanResponseFixture("dosis_sudah_tercatat"), nextDose }));
    expect(screen.getByText("Obat ini perlu diminum lagi besok pagi pukul 07.00.")).toBeInTheDocument();
    expect(screen.queryByText(/Melalui scan|Tanpa scan|Tercatat pukul/)).not.toBeInTheDocument();
    expect(screen.getByText(SCAN_OUTCOME.noConfirmation)).toBeInTheDocument();
  });
  test("hanya info memakai jadwal server besok, tanpa jadwal lengkap yang tidak dikirim server", () => {
    setup(scanResponseSchema.parse({ ...scanResponseFixture("hanya_info"), nextDose }));
    expect(screen.getByText(jadwalBerikutnya({ tanggal: "besok", kelompok: "pagi", jam: "07:00" }))).toBeInTheDocument();
    expect(screen.getByText("13 November 2026 · 07.00 WIB")).toBeInTheDocument();
    expect(screen.queryByText(OBAT.jamMinum)).not.toBeInTheDocument(); expect(screen.getByText(scanMedicineFixture.usageRule)).toBeInTheDocument();
  });
  test("penjelasan AI hanya tampil jika sudah diperiksa; informasi asli dan catatan tetap ada", () => {
    const result = scanResponseFixture("hanya_info");
    if (result.outcome !== "hanya_info") throw new Error("Fixture tidak sesuai");
    const view = setup({ ...result, medicine: { ...result.medicine, explanation: "Belum diperiksa uji" } });
    expect(screen.queryByText("Belum diperiksa uji")).not.toBeInTheDocument(); expect(screen.getByText(DRAFT.penjelasanBelumTersedia)).toBeInTheDocument(); view.unmount();
    setup({ ...result, medicine: { ...result.medicine, notes: "Catatan fiktif", explanationOrigin: "ai_dikonfirmasi", explanation: "Penjelasan diperiksa uji" } });
    expect(screen.getByText("Penjelasan diperiksa uji")).toBeInTheDocument(); expect(screen.getByText(OBAT.penjelasanDiperiksa)).toBeInTheDocument(); expect(screen.getByText("Catatan fiktif")).toBeInTheDocument();
  });
  test("informasi dapat dibuka dan kembali tanpa membuang pilihan slot; foto ulang mereset alur", async () => {
    const { user, onAgain } = setup();
    await user.click(screen.getByRole("button", { name: SCAN_OUTCOME.viewInfo }));
    expect(screen.getByRole("heading", { level: 1, name: SCAN_OUTCOME.infoTitle })).toHaveFocus();
    expect(screen.getByText(OBAT.informasiAsli)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: SCAN_OUTCOME.backToResult }));
    expect(screen.getByRole("heading", { level: 1, name: SCAN_OUTCOME.title })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Foto lagi" })); expect(onAgain).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("banner")).getByRole("link")).toHaveAttribute("href", "/");
  });
});
