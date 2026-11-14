import { expect, test } from "vitest";
import { medicineDetail, outputPreferenceThen, safeInternalPath, scanForDose } from "./routes";

test("tautan scan verifikasi meng-encode slotId (docs/01 §5)", () => {
  expect(scanForDose("obat-1:20261110:0700")).toBe("/scan?dosis=obat-1%3A20261110%3A0700");
});

test("tautan detail obat", () => {
  expect(medicineDetail("abc")).toBe("/medicines/abc");
});

test("tautan pilihan tampilan membawa tujuan kembali", () => {
  expect(outputPreferenceThen()).toBe("/output-preference");
  expect(outputPreferenceThen("/scan?dosis=a")).toBe("/output-preference?next=%2Fscan%3Fdosis%3Da");
});

test.each([
  ["/medicines", "/medicines"],
  ["https://situs-lain.example", "/"],
  ["//situs-lain.example", "/"],
  ["/\\situs-lain.example", "/"],
  ["/\n/situs-lain.example", "/"],
  ["/\t/situs-lain.example", "/"],
  ["/medicines?next=%2Fscan#info", "/medicines?next=%2Fscan#info"],
  [null, "/"],
])("safeInternalPath(%j) → %s", (value, expected) => {
  expect(safeInternalPath(value, "/")).toBe(expected);
});

test.each(["/\\situs-lain.example", "/\n/situs-lain.example", "/\t/situs-lain.example"])("normalisasi URL browser tidak dapat mengalihkan lewat %j", (value) => {
  const origin = "https://mosa.example";
  expect(new URL(value, origin).origin).toBe("https://situs-lain.example");
  expect(new URL(safeInternalPath(value, "/"), origin).origin).toBe(origin);
});
