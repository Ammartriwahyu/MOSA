import { describe, expect, test } from "vitest";
import { FAMILIAR_MEDICINES } from "./familiar-medicines";

describe("FAMILIAR_MEDICINES", () => {
  test("berisi 15–20 nama obat (PRD §19.1 #3)", () => {
    expect(FAMILIAR_MEDICINES.length).toBeGreaterThanOrEqual(15);
    expect(FAMILIAR_MEDICINES.length).toBeLessThanOrEqual(20);
  });

  test("hanya nama, tanpa kekuatan atau satuan (PRD §19 #15)", () => {
    for (const name of FAMILIAR_MEDICINES) {
      expect(name.trim()).toBe(name);
      expect(name).not.toBe("");
      expect(name).not.toMatch(/\d|\b(mg|mcg|ml|g)\b/i);
    }
  });

  test("tidak ada nama ganda (abaikan huruf besar/kecil)", () => {
    const lower = FAMILIAR_MEDICINES.map((n) => n.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  test("urut abjad", () => {
    const sorted = [...FAMILIAR_MEDICINES].sort((a, b) => a.localeCompare(b, "id"));
    expect(FAMILIAR_MEDICINES).toEqual(sorted);
  });

  test("memuat obat Akun Demo Juri", () => {
    expect(FAMILIAR_MEDICINES).toContain("Amlodipin");
    expect(FAMILIAR_MEDICINES).toContain("Metformin");
  });
});
