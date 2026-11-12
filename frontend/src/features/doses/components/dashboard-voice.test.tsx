import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CATAT_DOSIS, DASBOR, TOMBOL, bannerJatuhTempo } from "@/shared/copy";
import { installSpeechEngine, type TestSpeechEngine } from "@/shared/testing/speech-engine";
import { confirmBasicDose, getTodaysDoses } from "../api/doses";
import { doseFixture, todaysDosesFixture } from "../testing/dosing-fixture";
import { DashboardScreen } from "./dashboard-screen";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../api/doses", () => ({ getTodaysDoses: vi.fn(), confirmBasicDose: vi.fn() }));
let engine: TestSpeechEngine;
const clients: QueryClient[] = [];
beforeEach(() => { engine = installSpeechEngine(); vi.mocked(confirmBasicDose).mockClear(); });
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.unstubAllGlobals(); });
function setup(data = todaysDosesFixture()) {
  vi.mocked(getTodaysDoses).mockResolvedValue(data);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><DashboardScreen /></QueryClientProvider>);
}
test("banner jatuh tempo membacakan informasi asli persis tanpa mengonfirmasi; membuka dialog menghentikan", async () => {
  setup(); const button = await screen.findByRole("button", { name: TOMBOL.bacakan }); expect(engine.speak).not.toHaveBeenCalled();
  await userEvent.click(button); const text = engine.speak.mock.calls[0]![0].text;
  expect(text).toBe([DASBOR.waktunyaMinum, bannerJatuhTempo("Obat Uji"), "Obat Uji 5 mg · 1 tablet", "Sesudah makan", "Jadwal 07.00 WIB"].join("\n"));
  for (const line of text.split("\n")) expect(document.body.textContent).toContain(line);
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0"); expect(vi.mocked(confirmBasicDose)).not.toHaveBeenCalled();
  const calls = engine.cancel.mock.calls.length; await userEvent.click(screen.getByRole("button", { name: CATAT_DOSIS.tanpaScan }));
  await screen.findByRole("dialog"); await waitFor(() => expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls));
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.batal })); expect(engine.speak).toHaveBeenCalledTimes(1);
});
test("banner berikut membaca jadwal server tanpa autoplay; pergantian jadwal membatalkan", async () => {
  setup(todaysDosesFixture({ doses: [doseFixture({ status: "belum_tiba" })] }));
  await userEvent.click(await screen.findByRole("button", { name: TOMBOL.bacakan })); const text = engine.speak.mock.calls[0]![0].text;
  expect(text).toContain(DASBOR.jadwalBerikutnya); expect(text).toContain("07.00"); expect(text).toContain("besok");
  for (const line of text.split("\n")) expect(document.body.textContent).toContain(line);
  const calls = engine.cancel.mock.calls.length;
  vi.mocked(getTodaysDoses).mockResolvedValue(todaysDosesFixture({ doses: [doseFixture({ status: "belum_tiba" })], medicines: [{ medicineId: "obat-lain", summary: { confirmed: 0, total: 1 }, nextDose: { tanggal: "besok", kelompok: "pagi", jam: "07:00" } }] }));
  await clients[0]!.invalidateQueries(); await waitFor(() => expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls)); expect(engine.speak).toHaveBeenCalledTimes(1);
});
test("pemilih beberapa dosis menghentikan bacaan tanpa memilih atau mencatat otomatis", async () => {
  setup(todaysDosesFixture({ doses: [doseFixture(), doseFixture({ slotId: "lain:20261111:0700", medicineId: "lain" })], summary: { confirmed: 0, total: 2 } }));
  await userEvent.click(await screen.findByRole("button", { name: TOMBOL.bacakan })); const calls = engine.cancel.mock.calls.length;
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.scanObat })); await screen.findByRole("dialog");
  expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls); expect(confirmBasicDose).not.toHaveBeenCalled();
});
