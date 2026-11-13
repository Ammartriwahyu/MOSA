import { expect, test } from "vitest";
import { summarizeDurations } from "./measurements";

test("statistik memakai nearest-rank tanpa mengubah urutan sampel masukan", () => {
  const values = [10, 1, 8, 4, 5];
  expect(summarizeDurations(values)).toEqual({ samples: 5, minMs: 1, medianMs: 5, p95Ms: 10, maxMs: 10, meanMs: 5.6 });
  expect(values).toEqual([10, 1, 8, 4, 5]);
});
test("satu sampel tetap melaporkan jumlah satu, bukan estimasi populasi", () => {
  expect(summarizeDurations([1.234])).toEqual({ samples: 1, minMs: 1.23, medianMs: 1.23, p95Ms: 1.23, maxMs: 1.23, meanMs: 1.23 });
});
test.each([{ values: [] }, { values: [NaN] }, { values: [Infinity] }, { values: [-1] }])("sampel tidak sah $values tidak menerbitkan statistik sukses", ({ values }) => {
  expect(() => summarizeDurations(values)).toThrow("Sampel benchmark harus berisi durasi terbatas dan nonnegatif.");
});
