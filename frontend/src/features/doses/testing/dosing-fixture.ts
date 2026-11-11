import type { Dose, TodaysDoses } from "../schemas/todays-doses";

const MEDICINE_ID = "33333333-3333-4333-8333-333333333333";
export function doseFixture(overrides: Partial<Dose> = {}): Dose {
  return {
    slotId: `${MEDICINE_ID}:20261111:0700`, medicineId: MEDICINE_ID,
    scheduledDate: "2026-11-11", scheduledTime: "07:00", scheduledAt: "2026-11-11T00:00:00.000Z",
    period: "pagi", status: "jatuh_tempo", confirmation: null,
    medicine: { id: MEDICINE_ID, name: "Obat Uji", strength: "5mg", purpose: "Kegunaan uji", doseAmount: "1 tablet", usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null, labelSource: "keluarga", explanationOrigin: "teks_pengisi", explanation: null },
    ...overrides,
  };
}

/** Data fiktif tes saja; tidak diimpor jalur produksi. */
export function todaysDosesFixture(overrides: Partial<TodaysDoses> = {}): TodaysDoses {
  return {
    date: "2026-11-11", serverTime: "2026-11-11T00:30:00.000Z", summary: { confirmed: 0, total: 1 },
    doses: [doseFixture()], carryoverDoses: [], earlyDoses: [],
    medicines: [{ medicineId: MEDICINE_ID, summary: { confirmed: 0, total: 1 }, nextDose: { tanggal: "besok", kelompok: "pagi", jam: "07:00" } }],
    ...overrides,
  };
}
