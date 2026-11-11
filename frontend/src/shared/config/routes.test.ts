import { expect, test } from "vitest";
import { medicineDetail, scanForDose } from "./routes";

test("tautan scan verifikasi meng-encode slotId (docs/01 §5)", () => {
  expect(scanForDose("obat-1:20261110:0700")).toBe("/scan?dosis=obat-1%3A20261110%3A0700");
});

test("tautan detail obat", () => {
  expect(medicineDetail("abc")).toBe("/medicines/abc");
});
