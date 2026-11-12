import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DRAFT, OBAT, SCAN_OUTCOME, TOMBOL, jadwalTargetScan } from "@/shared/copy";
import { installSpeechEngine, type TestSpeechEngine } from "@/shared/testing/speech-engine";
import { scanOutcomeMessages } from "../lib/scan-outcome-message";
import { scanResponseFixture, scanSlotFixture } from "../testing/scan-response-fixtures";
import { ScanOutcomeView } from "./scan-outcome-view";

vi.mock("next/navigation", () => ({ usePathname: () => "/scan" }));
let engine: TestSpeechEngine;
beforeEach(() => { engine = installSpeechEngine(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test.each(["tidak_terbaca", "tidak_terdaftar", "kekuatan_tidak_terbaca", "kekuatan_beda", "dosis_sudah_tercatat", "bisa_konfirmasi", "tunggu_dulu", "hanya_info"] as const)("hasil %s membacakan hanya teks yang terlihat, tanpa token/POST/autoplay", async (outcome) => {
  const result = scanResponseFixture(outcome); const onContinue = vi.fn();
  render(<ScanOutcomeView result={result} onAgain={vi.fn()} onContinue={onContinue} />); expect(engine.speak).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); const text = engine.speak.mock.calls[0]![0].text;
  for (const line of text.split("\n")) expect(document.body.textContent).toContain(line);
  for (const message of scanOutcomeMessages(result, scanSlotFixture.slotId)) expect(text).toContain(message);
  expect(text).not.toMatch(/token-scan|expiresAt|scanToken/); expect(onContinue).not.toHaveBeenCalled();
});
test("slot berubah menghentikan audio; informasi obat mengganti bacaan hasil; akun berubah juga berhenti", async () => {
  const result = scanResponseFixture(); if (result.outcome !== "bisa_konfirmasi") throw new Error("fixture");
  const second = { ...result.slots[0]!, slotId: "obat-a:20261112:0800", scheduledTime: "08:00", scheduledAt: "2026-11-12T01:00:00Z" };
  const props = { result: { ...result, slots: [...result.slots, second] }, onAgain: vi.fn(), contextKey: "akun-a" };
  const view = render(<ScanOutcomeView {...props} />);
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); let calls = engine.cancel.mock.calls.length;
  await userEvent.click(screen.getByRole("radio", { name: jadwalTargetScan(second.scheduledDate, second.scheduledTime) })); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls);
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); expect(engine.speak.mock.calls[1]![0].text).toContain("08.00"); calls = engine.cancel.mock.calls.length;
  await userEvent.click(screen.getByRole("button", { name: SCAN_OUTCOME.viewInfo })); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls);
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); const info = engine.speak.mock.calls[2]![0].text;
  expect(info).toContain(DRAFT.penjelasanBelumTersedia); expect(info).toContain(OBAT.bukanSaranMedis); expect(info).not.toContain(SCAN_OUTCOME.matching);
  calls = engine.cancel.mock.calls.length; view.rerender(<ScanOutcomeView {...props} contextKey="akun-b" />); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls); expect(engine.speak).toHaveBeenCalledTimes(3);
});
test("informasi scan membacakan AI yang sudah diperiksa persis dan hanya jadwal yang dikirim server", async () => {
  const result = scanResponseFixture("hanya_info"); if (result.outcome !== "hanya_info") throw new Error("fixture");
  render(<ScanOutcomeView result={{ ...result, medicine: { ...result.medicine, name: "Obat\nUji", explanationOrigin: "ai_dikonfirmasi", explanation: "Kalimat uji.\nBaris uji." } }} onAgain={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); const text = engine.speak.mock.calls[0]![0].text;
  expect(text).toContain("Obat\nUji 5 mg"); expect(text).toContain("Kalimat uji.\nBaris uji."); expect(text).not.toContain(OBAT.jamMinum);
});
