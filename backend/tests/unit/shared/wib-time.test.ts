import { describe, expect, test } from "vitest";
import { fixedClock } from "../../../src/shared/domain/clock";
import { err, ok } from "../../../src/shared/domain/result";
import {
  addWibDays,
  endOfWibDay,
  formatTimeOfDay,
  fromWib,
  minutesOfDay,
  parseTimeOfDay,
  parseWibDate,
  startOfWibDay,
  toWib,
  type WibDate,
} from "../../../src/shared/domain/wib-time";

const date = (text: string): WibDate => {
  const parsed = parseWibDate(text);
  if (!parsed.ok) throw new Error(`tanggal uji tidak valid: ${text}`);
  return parsed.value;
};

describe("zona waktu mesin", () => {
  test("tes berjalan di zona yang bukan UTC dan bukan WIB", () => {
    const offset = new Date("2026-11-10T00:00:00Z").getTimezoneOffset();
    expect(offset).not.toBe(0);
    expect(offset).not.toBe(-420);
  });
});

describe("toWib", () => {
  test("menggeser UTC ke WIB (UTC+7)", () => {
    expect(toWib(Date.parse("2026-11-10T00:00:00Z"))).toEqual({
      date: "2026-11-10",
      time: { hour: 7, minute: 0 },
    });
  });

  test("23.59 dan 00.00 WIB jatuh di hari berbeda", () => {
    const before = toWib(Date.parse("2026-11-10T16:59:00Z"));
    const after = toWib(Date.parse("2026-11-10T17:00:00Z"));
    expect(before).toEqual({ date: "2026-11-10", time: { hour: 23, minute: 59 } });
    expect(after).toEqual({ date: "2026-11-11", time: { hour: 0, minute: 0 } });
  });

  test("23.50 dan 00.10 WIB jatuh di hari berbeda (testing-and-quality kasus 6)", () => {
    expect(toWib(Date.parse("2026-11-10T16:50:00Z")).date).toBe("2026-11-10");
    expect(toWib(Date.parse("2026-11-10T17:10:00Z")).date).toBe("2026-11-11");
  });

  test("detik dibuang (dibulatkan ke bawah ke menit)", () => {
    expect(toWib(Date.parse("2026-11-10T00:05:59.999Z")).time).toEqual({ hour: 7, minute: 5 });
  });

  test("pergantian tahun", () => {
    expect(toWib(Date.parse("2026-12-31T17:00:00Z")).date).toBe("2027-01-01");
  });
});

describe("fromWib", () => {
  test("kebalikan dari toWib", () => {
    const epoch = fromWib(date("2026-11-10"), { hour: 19, minute: 0 });
    expect(new Date(epoch).toISOString()).toBe("2026-11-10T12:00:00.000Z");
    expect(toWib(epoch)).toEqual({ date: "2026-11-10", time: { hour: 19, minute: 0 } });
  });

  test("jam 01.00 WIB dihitung di tanggalnya sendiri (jadwal 23.00 + 120 menit)", () => {
    const due = fromWib(date("2026-11-10"), { hour: 23, minute: 0 });
    const lastMinute = due + 120 * 60_000;
    expect(toWib(lastMinute)).toEqual({ date: "2026-11-11", time: { hour: 1, minute: 0 } });
  });
});

describe("batas hari WIB", () => {
  test("awal hari = 00.00 WIB, akhir hari eksklusif = 00.00 hari berikutnya", () => {
    const d = date("2026-11-10");
    expect(new Date(startOfWibDay(d)).toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(new Date(endOfWibDay(d)).toISOString()).toBe("2026-11-10T17:00:00.000Z");
    expect(toWib(endOfWibDay(d) - 1).date).toBe("2026-11-10");
    expect(toWib(endOfWibDay(d)).date).toBe("2026-11-11");
  });

  test("addWibDays melewati akhir bulan dan tahun", () => {
    expect(addWibDays(date("2026-11-30"), 1)).toBe("2026-12-01");
    expect(addWibDays(date("2027-01-01"), -1)).toBe("2026-12-31");
  });
});

describe("parseTimeOfDay", () => {
  test.each(["00:00", "07:00", "19:30", "23:59"])("menerima %s", (text) => {
    const parsed = parseTimeOfDay(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(formatTimeOfDay(parsed.value)).toBe(text);
  });

  test.each(["7:00", "24:00", "07:60", " 07:00", "07.00", "07:00:00", ""])("menolak %j", (text) => {
    const parsed = parseTimeOfDay(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.code).toBe("VALIDATION_FAILED");
  });

  test("minutesOfDay", () => {
    expect(minutesOfDay({ hour: 19, minute: 30 })).toBe(1170);
  });
});

describe("parseWibDate", () => {
  test("menolak tanggal mustahil dan format lain", () => {
    for (const text of ["2026-02-30", "2026-13-01", "10-11-2026", "2026-1-10"]) {
      expect(parseWibDate(text).ok).toBe(false);
    }
    expect(parseWibDate("2028-02-29").ok).toBe(true);
  });
});

describe("Result dan Clock", () => {
  test("ok/err membentuk union terdiskriminasi", () => {
    expect(ok(5)).toEqual({ ok: true, value: 5 });
    expect(err("x")).toEqual({ ok: false, error: "x" });
  });

  test("fixedClock selalu mengembalikan waktu yang sama", () => {
    const clock = fixedClock(1_000);
    expect([clock.now(), clock.now()]).toEqual([1_000, 1_000]);
  });
});
