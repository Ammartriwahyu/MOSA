import { describe, expect, test } from "vitest";
import { classifyDose, doseWindow } from "../../../src/modules/dosing/domain/dose-window";
import { dosePeriod } from "../../../src/modules/dosing/domain/time-periods";
import { parseTimeOfDay } from "../../../src/shared/domain/wib-time";
import { atWib } from "../../support/dosing-fixtures";

const MINUTE = 60_000;
const J = atWib("2026-11-11", "07:00");

describe("jendela dosis yang disetujui PM: J−30 sampai J+120 inklusif", () => {
  test.each([
    [-31, "belum_tiba"], [-30, "jatuh_tempo"], [-1, "jatuh_tempo"], [0, "jatuh_tempo"],
    [119, "jatuh_tempo"], [120, "jatuh_tempo"], [121, "terlewat"],
  ] as const)("J%+i menit → %s", (offset, expected) => {
    expect(classifyDose({ scheduledAt: J, now: J + offset * MINUTE, confirmed: false })).toBe(expected);
  });

  test("batas dihitung sampai milidetik, tanpa membulatkan seluruh menit akhir", () => {
    const window = doseWindow(J);
    expect(window).toEqual({ opensAt: J - 30 * MINUTE, closesAt: J + 120 * MINUTE });
    expect(classifyDose({ scheduledAt: J, now: window.opensAt - 1, confirmed: false })).toBe("belum_tiba");
    expect(classifyDose({ scheduledAt: J, now: window.closesAt + 1, confirmed: false })).toBe("terlewat");
  });

  test.each([-31, 0, 121, 1440])("konfirmasi yang sudah ada tetap sudah pada J%+i", (offset) => {
    expect(classifyDose({ scheduledAt: J, now: J + offset * MINUTE, confirmed: true })).toBe("sudah");
  });
});

describe("jendela bertumpuk tidak dipotong (keputusan PM opsi 2)", () => {
  test("07.00 dan 08.00 tetap terbuka bersama pada 07.30; mencatat satu tidak mengubah yang lain", () => {
    const second = atWib("2026-11-11", "08:00");
    const now = atWib("2026-11-11", "07:30");
    expect(classifyDose({ scheduledAt: J, now, confirmed: false })).toBe("jatuh_tempo");
    expect(classifyDose({ scheduledAt: second, now, confirmed: false })).toBe("jatuh_tempo");
    expect(classifyDose({ scheduledAt: J, now, confirmed: true })).toBe("sudah");
    expect(classifyDose({ scheduledAt: second, now, confirmed: false })).toBe("jatuh_tempo");
  });

  test.each([149, 150])("jarak %i menit: kedua slot terbuka tepat di akhir jendela pertama", (gap) => {
    const now = J + 120 * MINUTE;
    expect(classifyDose({ scheduledAt: J, now, confirmed: false })).toBe("jatuh_tempo");
    expect(classifyDose({ scheduledAt: J + gap * MINUTE, now, confirmed: false })).toBe("jatuh_tempo");
    expect(classifyDose({ scheduledAt: J, now: now + 1, confirmed: false })).toBe("terlewat");
    expect(classifyDose({ scheduledAt: J + gap * MINUTE, now: now + 1, confirmed: false })).toBe("jatuh_tempo");
  });

  test("23.00 masih jatuh tempo setelah tengah malam sampai tepat 01.00 hari berikutnya", () => {
    const scheduledAt = atWib("2026-11-11", "23:00");
    for (const now of [atWib("2026-11-11", "23:59"), atWib("2026-11-12", "00:00"), atWib("2026-11-12", "01:00")]) {
      expect(classifyDose({ scheduledAt, now, confirmed: false })).toBe("jatuh_tempo");
    }
    expect(classifyDose({ scheduledAt, now: atWib("2026-11-12", "01:00") + 1, confirmed: false })).toBe("terlewat");
  });
});

describe("kelompok waktu WIB (D10)", () => {
  test.each([
    ["00:00", "malam"], ["03:59", "malam"], ["04:00", "pagi"], ["10:59", "pagi"],
    ["11:00", "siang"], ["17:59", "siang"], ["18:00", "malam"], ["23:59", "malam"],
  ] as const)("%s → %s", (time, expected) => {
    const parsed = parseTimeOfDay(time);
    if (!parsed.ok) throw new Error("Jam uji tidak valid.");
    expect(dosePeriod(parsed.value)).toBe(expected);
  });
});
