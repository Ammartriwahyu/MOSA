import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CATAT_DOSIS, DASBOR, konfirmasiTanpaScan, LABEL_STATUS, TOMBOL } from "@/shared/copy";
import { ApiError } from "@/shared/lib";
import { confirmBasicDose, getTodaysDoses } from "../api/doses";
import { dosesQueryKey } from "../hooks/use-todays-doses";
import type { TodaysDoses } from "../schemas/todays-doses";
import { confirmedDoseFixture, doseCardsFixture } from "../testing/dose-cards-fixture";
import { doseFixture, todaysDosesFixture } from "../testing/dosing-fixture";
import { DashboardScreen } from "./dashboard-screen";

vi.mock("../api/doses", () => ({ getTodaysDoses: vi.fn(), confirmBasicDose: vi.fn() }));
const getDoses = vi.mocked(getTodaysDoses);
const post = vi.mocked(confirmBasicDose);
const clients: QueryClient[] = [];
const receipt = (dose = confirmedDoseFixture("dasar")) => ({ status: "sudah" as const, serverTime: dose.confirmation!.confirmedAt, confirmation: dose.confirmation! });
function recorded(level: "dasar" | "scan_terverifikasi" = "dasar"): TodaysDoses {
  return todaysDosesFixture({ summary: { confirmed: 1, total: 1 }, doses: [confirmedDoseFixture(level)], medicines: [{ medicineId: doseFixture().medicineId, summary: { confirmed: 1, total: 1 }, nextDose: null }] });
}
function setup(data = todaysDosesFixture()) {
  getDoses.mockResolvedValue(data);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>);
  return { client, user: userEvent.setup() };
}
async function open(user: ReturnType<typeof userEvent.setup>) {
  const trigger = await screen.findByRole("button", { name: CATAT_DOSIS.tanpaScan });
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: CATAT_DOSIS.judul });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeEnabled());
  return { dialog, trigger };
}
beforeEach(() => { getDoses.mockReset(); post.mockReset(); });
afterEach(() => { clients.forEach((client) => client.clear()); clients.length = 0; onlineManager.setOnline(true); });

describe("konfirmasi dosis basic", () => {
  test.each(["Batal", "Escape", "Tutup"])("%s tidak mengirim POST; fokus kembali ke pemicu", async (action) => {
    const { user } = setup();
    const { dialog, trigger } = await open(user);
    expect(dialog).toHaveAccessibleDescription(konfirmasiTanpaScan({ nama: "Obat Uji", kekuatan: "5mg" }));
    expect(within(dialog).getByText(/11 November 2026 · 07.00 WIB/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).not.toHaveFocus();
    if (action === "Escape") await user.keyboard("{Escape}");
    else await user.click(within(dialog).getByRole("button", { name: action }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(post).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });
  test("hanya jatuh tempo menawarkan aksi; tautan scan membawa slot yang tepat", async () => {
    setup(doseCardsFixture());
    const trigger = await screen.findByRole("button", { name: CATAT_DOSIS.tanpaScan });
    const card = trigger.closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByRole("link", { name: CATAT_DOSIS.scanDosis })).toHaveAttribute("href", `/scan?dosis=${encodeURIComponent("uji-c:20261111:0800")}`);
    for (const article of screen.getAllByRole("article").filter((item) => item !== card)) {
      expect(within(article).queryByRole("button", { name: CATAT_DOSIS.tanpaScan })).not.toBeInTheDocument();
      expect(within(article).queryByRole("link", { name: CATAT_DOSIS.scanDosis })).not.toBeInTheDocument();
    }
  });
  test("klik ganda menulis sekali, pending tidak menambah hitungan, Esc/Tutup/Batal terkunci", async () => {
    const { client, user } = setup();
    let finish!: (value: Awaited<ReturnType<typeof confirmBasicDose>>) => void;
    post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { dialog } = await open(user);
    await user.dblClick(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith(doseFixture().slotId, expect.anything());
    expect(client.getQueryData<TodaysDoses>(dosesQueryKey)?.summary).toEqual({ confirmed: 0, total: 1 });
    expect(within(dialog).getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Tutup" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(dialog).toBeInTheDocument();
    getDoses.mockResolvedValue(recorded());
    await act(async () => { finish(receipt()); });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(LABEL_STATUS.sudahTanpaScan)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.getByText(CATAT_DOSIS.berhasil)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
  test("POST sukses tetapi GET gagal: tanda terima tetap terlihat tanpa hitungan optimistis", async () => {
    const { user } = setup();
    const { dialog } = await open(user);
    post.mockResolvedValue(receipt());
    getDoses.mockRejectedValue(new ApiError("DATABASE_UNAVAILABLE", 503, "teks-server-pribadi"));
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    expect(await screen.findByText(CATAT_DOSIS.berhasil)).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(DASBOR.galatJudul);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("teks-server-pribadi");
    getDoses.mockResolvedValue(recorded());
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByRole("progressbar")).toHaveAttribute("value", "1");
    expect(post).toHaveBeenCalledOnce();
  });
  test("respons POST hilang: periksa jadwal menemukan catatan scan tanpa menaikkan/menimpa level", async () => {
    const { user } = setup();
    const { dialog } = await open(user);
    post.mockRejectedValue(new ApiError("TIMEOUT", null, "rahasia-uji"));
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CATAT_DOSIS.belumPasti);
    expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeDisabled();
    getDoses.mockResolvedValue(recorded("scan_terverifikasi"));
    await user.click(within(dialog).getByRole("button", { name: CATAT_DOSIS.periksaJadwal }));
    expect(await screen.findByText(CATAT_DOSIS.sudahTercatat)).toBeInTheDocument();
    expect(screen.getByText(LABEL_STATUS.sudahScan)).toBeInTheDocument();
    expect(screen.queryByText(CATAT_DOSIS.berhasil)).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });
  test("jaringan gagal tidak diulang otomatis; percobaan baru perlu cek GET dan klik manusia", async () => {
    const { user } = setup();
    const { dialog } = await open(user);
    post.mockRejectedValueOnce(new ApiError("NETWORK_ERROR", null, "uji")).mockImplementationOnce(async () => { getDoses.mockResolvedValue(recorded()); return receipt(); });
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    await within(dialog).findByText(CATAT_DOSIS.belumPasti);
    expect(post).toHaveBeenCalledOnce();
    await user.click(within(dialog).getByRole("button", { name: CATAT_DOSIS.periksaJadwal }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeEnabled());
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    expect(await screen.findByText(CATAT_DOSIS.berhasil)).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });
  test.each(["DOSE_MISSED", "DOSE_NOT_DUE", "NOT_FOUND"])("%s memerlukan pemeriksaan ulang dan tidak menjadi sukses palsu", async (code) => {
    const { user } = setup();
    const { dialog } = await open(user);
    post.mockRejectedValue(new ApiError(code, 409, "uji"));
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    await within(dialog).findByText(CATAT_DOSIS.jadwalBerubah);
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: code === "NOT_FOUND" ? [] : [doseFixture({ status: code === "DOSE_MISSED" ? "terlewat" : "belum_tiba" })] }));
    await user.click(within(dialog).getByRole("button", { name: CATAT_DOSIS.periksaJadwal }));
    await waitFor(() => expect(within(dialog).queryByText(CATAT_DOSIS.memeriksa)).not.toBeInTheDocument());
    expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeDisabled();
    expect(screen.queryByText(CATAT_DOSIS.berhasil)).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });
  test("409 dari perangkat lain memuat status server dan tidak mengklaim level dasar", async () => {
    const { user } = setup();
    const { dialog } = await open(user);
    post.mockRejectedValue(new ApiError("DOSE_ALREADY_CONFIRMED", 409, "uji"));
    getDoses.mockResolvedValue(recorded("scan_terverifikasi"));
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    expect(await screen.findByText(CATAT_DOSIS.sudahTercatat)).toBeInTheDocument();
    expect(await screen.findByText(LABEL_STATUS.sudahScan)).toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  });
  test.each(["status", "removed", "details"])("pembaruan %s saat dialog terbuka menutup izin menulis snapshot lama", async (change) => {
    const { client, user } = setup();
    const { dialog } = await open(user);
    const updated = change === "removed" ? [] : [doseFixture(change === "status" ? { status: "terlewat" } : { medicine: { ...doseFixture().medicine, strength: "10 mg" } })];
    await act(async () => { client.setQueryData(dosesQueryKey, todaysDosesFixture({ doses: updated })); });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CATAT_DOSIS.jadwalBerubah);
    expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  });
  test("cek saat membuka menemukan dosis sudah tercatat, tanpa mengirim POST", async () => {
    const { user } = setup();
    const trigger = await screen.findByRole("button", { name: CATAT_DOSIS.tanpaScan });
    getDoses.mockResolvedValue(recorded());
    await user.click(trigger);
    expect(await screen.findByText(CATAT_DOSIS.sudahTercatat)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  test("cek awal gagal tidak mengizinkan tulis dan fokus batal memiliki cadangan saat kartu hilang", async () => {
    const { user } = setup();
    const trigger = await screen.findByRole("button", { name: CATAT_DOSIS.tanpaScan });
    getDoses.mockRejectedValue(new ApiError("NETWORK_ERROR", null, "uji"));
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText(CATAT_DOSIS.gagalMuat);
    expect(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(post).not.toHaveBeenCalled();
  });
  test("banner beberapa slot meminta pilihan eksplisit dengan URL tiap slot", async () => {
    const first = doseFixture();
    const second = doseFixture({ slotId: "slot:0800", scheduledTime: "08:00", scheduledAt: "2026-11-11T01:00:00Z" });
    const { user } = setup(todaysDosesFixture({ doses: [first, second] }));
    await user.click(await screen.findByRole("button", { name: "Scan Obat" }));
    const dialog = await screen.findByRole("dialog", { name: CATAT_DOSIS.pilihJadwal });
    await waitFor(() => expect(within(dialog).getAllByRole("link")).toHaveLength(2));
    expect(within(dialog).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([first, second].map((d) => `/scan?dosis=${encodeURIComponent(d.slotId)}`));
    await user.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(post).not.toHaveBeenCalled();
  });
  test("konfirmasi sesudah tengah malam menulis slot tanggal asal, progres hari ini tetap nol", async () => {
    const dose = doseFixture({ slotId: "obat:20261111:2300", scheduledTime: "23:00", scheduledAt: "2026-11-11T16:00:00Z", period: "malam" });
    const data = todaysDosesFixture({ date: "2026-11-12", serverTime: "2026-11-11T17:30:00Z", doses: [], carryoverDoses: [dose], summary: { confirmed: 0, total: 0 } });
    const { user } = setup(data);
    const { dialog } = await open(user);
    const saved = confirmedDoseFixture("dasar", dose, "2026-11-11T17:30:00Z");
    post.mockImplementation(async () => { getDoses.mockResolvedValue({ ...data, carryoverDoses: [saved] }); return receipt(saved); });
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    expect(await screen.findByText(CATAT_DOSIS.berhasil)).toBeInTheDocument();
    expect(post.mock.calls[0]?.[0]).toBe(dose.slotId);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Sudah 0 dari 0 dosis");
  });
  test("offline sesudah dialog siap tidak mengantre POST untuk dieksekusi saat reconnect", async () => {
    const { user } = setup();
    const { dialog } = await open(user);
    post.mockRejectedValue(new ApiError("NETWORK_ERROR", null, "uji"));
    onlineManager.setOnline(false);
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    await within(dialog).findByText(CATAT_DOSIS.belumPasti);
    await act(async () => { onlineManager.setOnline(true); });
    expect(post).toHaveBeenCalledOnce();
  });
  test("axe dialog konfirmasi", async () => {
    const { user } = setup();
    const { dialog } = await open(user);
    expect((await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
  test("pemilih kehilangan pemicu setelah refresh: Batal kembali ke judul dasbor", async () => {
    const first = doseFixture();
    const { user } = setup(todaysDosesFixture({ doses: [first, { ...first, slotId: "slot-lain" }] }));
    const trigger = await screen.findByRole("button", { name: "Scan Obat" });
    getDoses.mockResolvedValue(todaysDosesFixture());
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: CATAT_DOSIS.pilihJadwal });
    await waitFor(() => expect(within(dialog).getAllByRole("link")).toHaveLength(1));
    await user.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
  test("refetch latar tidak mengganti kartu dengan skeleton atau menonaktifkan pemicu", async () => {
    const { client } = setup();
    const trigger = await screen.findByRole("button", { name: CATAT_DOSIS.tanpaScan });
    getDoses.mockImplementation(() => new Promise(() => {}));
    await act(async () => { void client.refetchQueries({ queryKey: dosesQueryKey }); });
    expect(trigger).toBeEnabled();
    expect(screen.queryByText(DASBOR.memuat)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });
  test("GET lama yang selesai sesudah POST tidak menimpa hasil pembaruan server", async () => {
    const { client, user } = setup();
    const { dialog } = await open(user);
    let finishPost!: (value: Awaited<ReturnType<typeof confirmBasicDose>>) => void;
    let finishOldGet!: (value: TodaysDoses) => void;
    post.mockImplementation(() => new Promise((resolve) => { finishPost = resolve; }));
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    getDoses.mockImplementationOnce(() => new Promise((resolve) => { finishOldGet = resolve; })).mockResolvedValue(recorded());
    await act(async () => { void client.refetchQueries({ queryKey: dosesQueryKey }); });
    await act(async () => { finishPost(receipt()); });
    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1"));
    await act(async () => { finishOldGet(todaysDosesFixture()); });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.queryByRole("button", { name: CATAT_DOSIS.tanpaScan })).not.toBeInTheDocument();
  });
  test("setelah tanda terima, banner jatuh tempo lama disembunyikan selama GET baru belum selesai", async () => {
    const { client, user } = setup();
    const { dialog } = await open(user);
    let finishGet!: (value: TodaysDoses) => void;
    post.mockResolvedValue(receipt());
    getDoses.mockImplementationOnce(() => new Promise((resolve) => { finishGet = resolve; }));
    await user.click(within(dialog).getByRole("button", { name: TOMBOL.sudahSayaMinum }));
    await screen.findByText(CATAT_DOSIS.berhasil);
    expect(screen.getByText(CATAT_DOSIS.memeriksa)).toBeInTheDocument();
    expect(screen.queryByText(/Sekarang waktunya/)).not.toBeInTheDocument();
    expect(client.getQueryData<TodaysDoses>(dosesQueryKey)?.summary.confirmed).toBe(0);
    await act(async () => { finishGet(recorded()); });
    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1"));
  });
});
