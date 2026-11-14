import { describe, expect, test } from "vitest";
import { parseScheduleDays } from "../../../src/modules/medication/domain/value-objects/schedule-days";

describe("parseScheduleDays", () => {
  test("diurutkan; satu sampai tujuh hari diterima", () => {
    expect(parseScheduleDays([7, 1, 3])).toEqual({ ok: true, value: [1, 3, 7] });
    expect(parseScheduleDays([1, 2, 3, 4, 5, 6, 7])).toEqual({ ok: true, value: [1, 2, 3, 4, 5, 6, 7] });
  });
  test.each([
    [[], "kosong"],
    [[0], "format"],
    [[8], "format"],
    [[1.5], "format"],
    [[2, 2], "duplikat"],
  ] as const)("%j ditolak (%s)", (days, reason) => {
    expect(parseScheduleDays(days)).toEqual({ ok: false, reason });
  });
});
