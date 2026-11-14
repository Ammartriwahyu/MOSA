import type { Dose, TodaysDoses } from "../schemas/todays-doses";
import { doseFixture, todaysDosesFixture } from "./dosing-fixture";

export function confirmedDoseFixture(level: NonNullable<Dose["confirmation"]>["level"], overrides: Partial<Dose> = {}, confirmedAt = "2026-11-11T00:35:00.000Z"): Dose {
  const dose = doseFixture(overrides);
  return { ...dose, status: "sudah", confirmation: {
    id: `catatan-${dose.slotId}`, slotId: dose.slotId, medicineId: dose.medicineId,
    scheduledDate: dose.scheduledDate, scheduledTime: dose.scheduledTime, confirmedAt, level,
  } };
}

export function doseCardsFixture(): TodaysDoses {
  function slot(id: string, name: string, time: string, period: Dose["period"], status: Dose["status"], source: Dose["medicine"]["labelSource"] = "apoteker"): Dose {
    return doseFixture({
      slotId: `${id}:20261111:${time.replace(":", "")}`, medicineId: id, scheduledTime: time,
      scheduledAt: new Date(`2026-11-11T${time}:00+07:00`).toISOString(), period, status,
      medicine: { ...doseFixture().medicine, id, name, labelSource: source },
    });
  }
  return todaysDosesFixture({
    summary: { confirmed: 2, total: 6 },
    doses: [
      slot("uji-d", "Obat Uji D", "04:30", "pagi", "terlewat"),
      confirmedDoseFixture("scan_terverifikasi", slot("uji-a", "Obat Uji A", "06:30", "pagi", "sudah"), "2026-11-10T23:40:00.000Z"),
      confirmedDoseFixture("dasar", slot("uji-b", "Obat Uji B", "07:00", "pagi", "sudah", "keluarga"), "2026-11-11T00:10:00.000Z"),
      slot("uji-c", "Obat Uji C", "08:00", "pagi", "jatuh_tempo", "keluarga"),
      slot("uji-e", "Obat Uji E", "12:00", "siang", "belum_tiba"),
      slot("uji-c", "Obat Uji C", "19:00", "malam", "belum_tiba", "keluarga"),
    ],
    medicines: [
      { medicineId: "uji-a", summary: { confirmed: 1, total: 1 }, nextDose: { tanggal: "besok", kelompok: "pagi", jam: "06:30" } },
      { medicineId: "uji-b", summary: { confirmed: 1, total: 1 }, nextDose: { tanggal: "besok", kelompok: "pagi", jam: "07:00" } },
      { medicineId: "uji-c", summary: { confirmed: 0, total: 2 }, nextDose: { tanggal: "hari_ini", kelompok: "pagi", jam: "08:00" } },
      { medicineId: "uji-d", summary: { confirmed: 0, total: 1 }, nextDose: { tanggal: "besok", kelompok: "pagi", jam: "04:30" } },
      { medicineId: "uji-e", summary: { confirmed: 0, total: 1 }, nextDose: { tanggal: "hari_ini", kelompok: "siang", jam: "12:00" } },
    ],
  });
}
