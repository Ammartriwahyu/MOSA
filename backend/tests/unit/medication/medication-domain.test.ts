import { describe, expect, test } from "vitest";
import {
  deactivateMedicine,
  reviseMedicine,
  validateMedicineInput,
  type Medicine,
  type MedicineInput,
} from "../../../src/modules/medication/domain/medicine";
import { normalizeMedicineName } from "../../../src/modules/medication/domain/services/medicine-name-normalizer";
import { parseScheduleTimes } from "../../../src/modules/medication/domain/value-objects/schedule-times";
import { parseStrength } from "../../../src/modules/medication/domain/value-objects/strength";

describe("normalizeMedicineName (docs/01 §5)", () => {
  test.each([
    ["Amlodipin", "amlodipin"],
    ["Amlodipine besylate", "amlodipin"], // AC-21
    ["AMLODIPINE BESILAT 5 mg", "amlodipin"],
    ["Metformin HCl", "metformin"],
    ["Metformin hidroklorida tablet", "metformin"],
    ["Natrium Diklofenak", "diklofenak"],
    ["  Simvastatin   20mg ", "simvastatin"],
    ["Vitamin B-Kompleks", "vitamin b kompleks"],
    ["Paracetamol (Kaplet)", "paracetamol"],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeMedicineName(raw)).toBe(expected);
  });

  test("nama yang hanya berisi kata sediaan/angka menjadi kosong (tidak bisa dicocokkan)", () => {
    expect(normalizeMedicineName("Tablet 500 mg")).toBe("");
  });

  test("nama berbeda tetap berbeda", () => {
    expect(normalizeMedicineName("Amlodipin")).not.toBe(normalizeMedicineName("Amiodaron"));
  });
});

describe("parseStrength", () => {
  test.each([
    ["5 mg", "5mg"],
    ["5mg", "5mg"],
    ["5 miligram", "5mg"],
    ["500 MG", "500mg"],
    ["0,5 mg", "0.5mg"],
    ["2.5mg", "2.5mg"],
    ["5.0 mg", "5mg"],
    ["100 mcg", "100mcg"],
    ["100 µg", "100mcg"],
    ["1 g", "1g"],
    ["125 mg/5 ml", "125mg/5ml"],
  ])("%j → %j", (raw, expected) => {
    expect(parseStrength(raw)?.normalized).toBe(expected);
  });

  test("5 mg dan 10 mg berbeda (kekuatan beda = obat beda)", () => {
    expect(parseStrength("5 mg")?.normalized).not.toBe(parseStrength("10 mg")?.normalized);
  });

  test.each(["", "lima mg", "5", "mg", "5 sendok", "0 mg", "5 mg/5 ml/2 ml"])("ditolak: %j", (raw) => {
    expect(parseStrength(raw)).toBeNull();
  });
});

describe("parseScheduleTimes", () => {
  test("diurutkan dan dinormalkan", () => {
    expect(parseScheduleTimes(["19:00", " 07:00"])).toEqual({ ok: true, value: ["07:00", "19:00"] });
  });

  test.each([
    [[], "kosong"],
    [["7:00"], "format"],
    [["24:00"], "format"],
    [["07:00", "07:00"], "duplikat"],
    [["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"], "terlalu_banyak"],
  ] as const)("%j ditolak (%s)", (raw, reason) => {
    expect(parseScheduleTimes(raw)).toEqual({ ok: false, reason });
  });
});

// Data fiktif.
const VALID: MedicineInput = {
  name: "Amlodipin",
  strength: "5 mg",
  purpose: "Untuk menurunkan tekanan darah tinggi",
  doseAmount: "1 tablet",
  usageRule: "sesudah makan",
  warnings: "Jangan dihentikan mendadak",
  notes: null,
  intakeTimes: ["19:00", "07:00"],
  labelSource: "apoteker",
  explanationOrigin: "ai_dikonfirmasi",
  explanation: "Minum obat ini sesudah makan. Jangan dihentikan mendadak.",
};

function fields(input: MedicineInput): unknown {
  const result = validateMedicineInput(input);
  return result.ok ? [] : result.error.details?.fields;
}

describe("validateMedicineInput", () => {
  test("isian sah menjadi draft ternormalisasi", () => {
    const result = validateMedicineInput(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      nameNormalized: "amlodipin",
      strengthNormalized: "5mg",
      intakeTimes: ["07:00", "19:00"],
      explanationOrigin: "ai_dikonfirmasi",
    });
  });

  test("penjelasan yang menambah angka atau anjuran baru ditolak saat simpan (pagar AI tidak bisa dilewati)", () => {
    expect(fields({ ...VALID, explanation: "Minum 2 tablet sesudah makan." })).toEqual(["explanation"]);
    expect(fields({ ...VALID, explanation: "Obat untuk darah tinggi, minum sesudah makan." })).toEqual(["explanation"]);
  });

  test("ai_dikonfirmasi tanpa teks penjelasan ditolak", () => {
    expect(fields({ ...VALID, explanation: "  " })).toEqual(["explanation"]);
  });

  test("teks_pengisi tidak boleh membawa penjelasan AI (tidak ada teks AI yang belum diperiksa)", () => {
    expect(fields({ ...VALID, explanationOrigin: "teks_pengisi" })).toEqual(["explanation"]);
    expect(validateMedicineInput({ ...VALID, explanationOrigin: "teks_pengisi", explanation: null }).ok).toBe(true);
  });

  test("semua kolom bermasalah dilaporkan sekaligus, hanya nama kolom (tanpa nilai)", () => {
    const result = validateMedicineInput({
      ...VALID,
      name: "",
      strength: "lima",
      purpose: " ",
      intakeTimes: ["07:00", "07:00"],
      notes: "x".repeat(501),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION_FAILED");
    expect(result.error.details).toEqual({ fields: ["name", "strength", "purpose", "notes", "intakeTimes"] });
    expect(JSON.stringify(result.error)).not.toContain("lima");
  });

  test("catatan kosong disimpan sebagai null", () => {
    const result = validateMedicineInput({ ...VALID, notes: "   " });
    expect(result.ok && result.value.notes).toBeNull();
  });
});

describe("reviseMedicine dan deactivateMedicine", () => {
  const existing: Medicine = {
    id: "obat-1",
    householdId: "rumah-1",
    name: "Amlodipin",
    nameNormalized: "amlodipin",
    strength: "5 mg",
    strengthNormalized: "5mg",
    purpose: "x",
    doseAmount: "1 tablet",
    usageRule: "sesudah makan",
    warnings: "x",
    notes: null,
    intakeTimes: ["07:00"],
    labelSource: "keluarga",
    explanation: "Penjelasan lama.",
    explanationOrigin: "ai_dikonfirmasi",
    active: true,
    createdAt: 1,
  };

  test("mengubah = mengganti seluruh isian; penjelasan lama tidak terbawa (PRD §19 #11)", () => {
    const result = reviseMedicine(existing, { ...VALID, explanationOrigin: "teks_pengisi", explanation: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ id: "obat-1", householdId: "rumah-1", createdAt: 1, explanation: null, labelSource: "apoteker" });
  });

  test("obat nonaktif tidak bisa diubah atau dihapus lagi", () => {
    const inactive = { ...existing, active: false };
    expect(reviseMedicine(inactive, VALID)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(deactivateMedicine(inactive)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  test("hapus lunak menandai nonaktif tanpa mengubah isian", () => {
    const result = deactivateMedicine(existing);
    expect(result.ok && result.value).toEqual({ ...existing, active: false });
  });
});
