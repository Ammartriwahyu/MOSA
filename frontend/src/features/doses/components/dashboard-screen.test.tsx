import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DASBOR, OBAT } from "@/shared/copy";
import { getTodaysDoses } from "../api/doses";
import { dosesQueryKey } from "../hooks/use-todays-doses";
import type { TodaysDoses } from "../schemas/todays-doses";
import { doseFixture, todaysDosesFixture } from "../testing/dosing-fixture";
import { DashboardScreen } from "./dashboard-screen";

vi.mock("../api/doses", () => ({ getTodaysDoses: vi.fn(), confirmBasicDose: vi.fn() }));
const getDoses = vi.mocked(getTodaysDoses);
const clients: QueryClient[] = [];
function renderDashboard(data?: TodaysDoses) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  if (data) client.setQueryData(dosesQueryKey, data);
  return { client, ...render(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>) };
}
afterEach(() => { clients.forEach((client) => client.clear()); clients.length = 0; getDoses.mockReset(); });

describe("dasbor", () => {
  test("memuat memiliki label terlihat, header dan tautan Pengaturan", () => {
    getDoses.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(DASBOR.memuat)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "TepatMinum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pengaturan" })).toHaveAttribute("href", "/settings");
    expect(screen.queryByText(DASBOR.kosongJudul)).not.toBeInTheDocument();
  });
  test("akun tanpa obat: tambah pertama dan kalender statis dari tanggal server", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: [], medicines: [], summary: { confirmed: 0, total: 0 } }));
    renderDashboard();
    expect(await screen.findByText(DASBOR.kosongJudul)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: DASBOR.tambahPertama })).toHaveAttribute("href", "/medicines/new");
    const calendar = screen.getByRole("list", { name: DASBOR.kalender });
    expect(within(calendar).getAllByRole("listitem")).toHaveLength(5);
    expect(calendar.querySelector('[aria-current="date"] time')).toHaveAttribute("datetime", "2026-11-11");
    expect(screen.getByText(/Rabu, 11 November · 07.30 WIB/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  test("banner memakai kalimat B1, data asli, dan status dari server tanpa menghitung ulang waktu", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ serverTime: "2026-11-11T15:00:00.000Z", summary: { confirmed: 3, total: 7 } }));
    renderDashboard();
    expect(await screen.findByText("Sekarang waktunya minum Obat Uji.")).toBeInTheDocument();
    expect(screen.getByText("Obat Uji 5 mg · 1 tablet")).toBeInTheDocument();
    expect(screen.getByText("Sesudah makan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Scan Obat" })).toHaveAttribute("href", `/scan?dosis=${encodeURIComponent(doseFixture().slotId)}`);
    const progress = screen.getByRole("progressbar", { name: DASBOR.progresHariIni });
    expect(progress).toHaveAttribute("value", "3");
    expect(progress).toHaveAttribute("max", "7");
    expect(progress).toHaveAttribute("aria-valuetext", "Sudah 3 dari 7 dosis");
    expect(screen.getByText(DASBOR.tanpaScan)).toBeInTheDocument();
    expect(screen.getByText(DASBOR.melaluiScan)).toBeInTheDocument();
  });
  test("slot bertumpuk tetap ditampilkan semua tanpa memilih dosis otomatis", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: [doseFixture(), doseFixture({ slotId: "slot-kedua", scheduledTime: "08:00", scheduledAt: "2026-11-11T01:00:00.000Z" })] }));
    renderDashboard();
    expect(await screen.findByText(DASBOR.beberapaDosis)).toBeInTheDocument();
    expect(screen.getAllByText("Sekarang waktunya minum Obat Uji.")).toHaveLength(2);
    expect(screen.getByText("07.00")).toBeInTheDocument();
    expect(screen.getByText("08.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan Obat" })).toBeInTheDocument();
  });
  test("slot lintas tengah malam tampil tanpa menambah hitungan hari ini", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: [], carryoverDoses: [doseFixture({ scheduledDate: "2026-11-10", slotId: "kemarin" })], earlyDoses: [doseFixture({ scheduledDate: "2026-11-12", slotId: "besok" })], summary: { confirmed: 0, total: 0 } }));
    renderDashboard();
    expect(await screen.findByText(DASBOR.beberapaDosis)).toBeInTheDocument();
    expect(screen.getByText(/2026-11-10/)).toBeInTheDocument();
    expect(screen.getByText(/2026-11-12/)).toBeInTheDocument();
    expect(screen.getByText("Sudah 0 dari 0 dosis")).toBeInTheDocument();
  });
  test("jadwal berikutnya dari API termasuk besok, tanpa banner minum untuk belum tiba", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: [doseFixture({ status: "belum_tiba" })] }));
    renderDashboard();
    expect(await screen.findByText("besok pagi pukul 07.00 WIB.")).toBeInTheDocument();
    expect(screen.queryByText(/Sekarang waktunya/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.tambahObat })).toHaveAttribute("href", "/medicines/new");
  });
  test("obat aktif tanpa slot hari ini tidak dianggap akun kosong; nilai nol bukan semua sudah diminum", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: [], summary: { confirmed: 0, total: 0 } }));
    renderDashboard();
    expect(await screen.findByText(DASBOR.tidakAdaSlotHariIni)).toBeInTheDocument();
    expect(screen.queryByText(DASBOR.kosongJudul)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });
  test("tidak ada nextDose tidak menebak jadwal baru", async () => {
    getDoses.mockResolvedValue(todaysDosesFixture({ doses: [doseFixture({ status: "terlewat" })], medicines: [{ medicineId: "obat", summary: { confirmed: 0, total: 1 }, nextDose: null }] }));
    renderDashboard();
    expect(await screen.findByText(DASBOR.tidakAdaJadwalBerikutnya)).toBeInTheDocument();
    expect(screen.queryByText(/Sekarang waktunya/)).not.toBeInTheDocument();
  });
  test("gagal lalu coba lagi memuat data; galat tidak disamarkan menjadi akun kosong", async () => {
    getDoses.mockRejectedValueOnce(new Error("NETWORK_ERROR")).mockResolvedValueOnce(todaysDosesFixture());
    renderDashboard();
    expect(await screen.findByRole("alert")).toHaveTextContent(DASBOR.galatJudul);
    expect(screen.queryByText(DASBOR.kosongJudul)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("Sekarang waktunya minum Obat Uji.")).toBeInTheDocument();
  });
  test("refetch gagal menutup banner lama, cache baru mengganti progres tanpa skeleton", async () => {
    getDoses.mockImplementation(() => new Promise(() => {}));
    const { client } = renderDashboard(todaysDosesFixture());
    expect(within(screen.getByRole("region", { name: DASBOR.progresHariIni })).getByText("Sudah 0 dari 1 dosis")).toBeInTheDocument();
    await act(async () => { client.setQueryData(dosesQueryKey, todaysDosesFixture({ summary: { confirmed: 1, total: 1 } })); });
    expect(await screen.findByText("Sudah 1 dari 1 dosis")).toBeInTheDocument();
    expect(screen.queryByText(DASBOR.memuat)).not.toBeInTheDocument();
    getDoses.mockRejectedValue(new Error("NETWORK_ERROR"));
    await act(async () => { await client.cancelQueries({ queryKey: dosesQueryKey }); await client.refetchQueries({ queryKey: dosesQueryKey }); });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/Sekarang waktunya/)).not.toBeInTheDocument();
  });
  test.each([false, true])("axe tanpa pelanggaran (kosong=%s)", async (empty) => {
    getDoses.mockResolvedValue(todaysDosesFixture(empty ? { doses: [], medicines: [], summary: { confirmed: 0, total: 0 } } : {}));
    const { container } = renderDashboard();
    await waitFor(() => expect(getDoses).toHaveBeenCalledOnce());
    await screen.findByText(empty ? DASBOR.kosongJudul : "Sekarang waktunya minum Obat Uji.");
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
});
