import { expect, test } from "vitest";
import { parseScanTarget } from "./scan-target";

test("scan generik dan ID slot yang sudah didekode Next dipertahankan", () => {
  expect(parseScanTarget()).toEqual({ mode: "generic" });
  expect(parseScanTarget("obat-a:20261112:0700")).toEqual({ mode: "selected", slotId: "obat-a:20261112:0700", date: "2026-11-12", time: "07:00" });
});
test.each(["", ["obat-a:20261112:0700", "obat-b:20261112:0700"], "obat-a%3A20261112%3A0700", "obat-a:20260230:0700", "obat-a:20261112:2500", "obat-a:20261112:0760", "obat-a:00001112:0700", "../obat:20261112:0700"])("target %j ditolak dan tidak berubah menjadi generik", (value) => {
  expect(parseScanTarget(value)).toEqual({ mode: "invalid" });
});
