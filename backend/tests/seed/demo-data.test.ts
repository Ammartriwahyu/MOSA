import { describe, expect, test } from "vitest";
import {
  AMLODIPIN_ID,
  DEMO_HOUSEHOLD_ID,
  METFORMIN_ID,
  demoMedicines,
  wibTimeOfDay,
} from "../../supabase/seed/demo-data";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

describe("wibTimeOfDay", () => {
  test("mengubah UTC ke WIB (UTC+7) dan membulatkan ke bawah ke menit", () => {
    expect(wibTimeOfDay(new Date("2026-11-10T00:05:59Z"))).toBe("07:05");
  });

  test("melewati tengah malam WIB tanpa bergantung zona waktu mesin", () => {
    expect(wibTimeOfDay(new Date("2026-11-10T16:59:00Z"))).toBe("23:59");
    expect(wibTimeOfDay(new Date("2026-11-10T17:00:00Z"))).toBe("00:00");
  });
});

describe("demoMedicines", () => {
  const now = new Date("2026-11-10T06:42:30Z"); // 13.42 WIB

  test("jadwal normal: Amlodipin 5 mg 07.00 dan 19.00, Metformin 500 mg di jam lain", () => {
    const [amlodipin, metformin] = demoMedicines("normal", now);
    expect(amlodipin).toMatchObject({ id: AMLODIPIN_ID, name: "Amlodipin", strength: "5 mg" });
    expect(amlodipin?.intake_times).toEqual(["07:00", "19:00"]);
    expect(metformin).toMatchObject({ id: METFORMIN_ID, name: "Metformin", strength: "500 mg" });
    expect(metformin?.intake_times).toEqual(["12:00", "18:00"]);
  });

  test("mode jatuh tempo: hanya jadwal Metformin yang digeser ke menit sekarang WIB", () => {
    const [amlodipin, metformin] = demoMedicines("jatuh_tempo", now);
    expect(metformin?.intake_times).toEqual(["13:42"]);
    expect(amlodipin?.intake_times).toEqual(["07:00", "19:00"]);
  });

  test("baris obat lolos aturan skema: milik rumah tangga demo, jam HH:mm unik, penjelasan terkonfirmasi", () => {
    for (const mode of ["normal", "jatuh_tempo"] as const) {
      for (const m of demoMedicines(mode, now)) {
        expect(m.household_id).toBe(DEMO_HOUSEHOLD_ID);
        expect(m.intake_times.length).toBeGreaterThan(0);
        expect(m.intake_times.every((t) => HHMM.test(t))).toBe(true);
        expect(new Set(m.intake_times).size).toBe(m.intake_times.length);
        expect(m.explanation_origin).toBe("ai_dikonfirmasi");
        expect(m.explanation.trim()).not.toBe("");
        expect(m.purpose.trim()).not.toBe("");
      }
    }
  });

  test("seed dua kali menghasilkan ID yang sama (idempoten)", () => {
    const ids = (mode: "normal" | "jatuh_tempo") => demoMedicines(mode, now).map((m) => m.id);
    expect(ids("normal")).toEqual(ids("normal"));
    expect(ids("jatuh_tempo")).toEqual(ids("normal"));
  });
});
