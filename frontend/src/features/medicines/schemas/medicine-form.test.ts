import { describe, expect, test } from "vitest";
import { DRAFT, FORM_OBAT } from "@/shared/copy";
import { emptyMedicineForm, validateMedicineForm, type MedicineFormValues } from "./medicine-form";

function filled(patch: Partial<MedicineFormValues> = {}): MedicineFormValues {
  return {
    ...emptyMedicineForm(),
    labelSource: "apoteker",
    name: " Amlodipin ",
    strength: "5 mg",
    purpose: "Menurunkan tekanan darah tinggi",
    usageRule: "Sesudah makan",
    doseAmount: "1 tablet",
    times: [
      { key: "a", time: "19:00", checked: true },
      { key: "b", time: "07:00", checked: true },
      { key: "c", time: "12:00", checked: false },
    ],
    warnings: "Jangan dihentikan mendadak",
    ...patch,
  };
}

describe("validateMedicineForm", () => {
  test("isian sah: dirapikan, jam terpilih saja dan terurut, catatan kosong = null", () => {
    expect(validateMedicineForm(filled())).toEqual({
      ok: true,
      value: {
        labelSource: "apoteker",
        name: "Amlodipin",
        strength: "5 mg",
        purpose: "Menurunkan tekanan darah tinggi",
        usageRule: "Sesudah makan",
        doseAmount: "1 tablet",
        intakeTimes: ["07:00", "19:00"],
        warnings: "Jangan dihentikan mendadak",
        notes: null,
      },
    });
  });

  test("formulir kosong: semua kolom wajib dan sumber ditandai", () => {
    const result = validateMedicineForm(emptyMedicineForm());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toMatchObject({
      labelSource: FORM_OBAT.galatSumber,
      name: FORM_OBAT.galatWajib,
      strength: FORM_OBAT.galatWajib,
      purpose: FORM_OBAT.galatWajib,
      usageRule: FORM_OBAT.galatWajib,
      doseAmount: FORM_OBAT.galatWajib,
      warnings: FORM_OBAT.galatWajib,
      times: FORM_OBAT.galatJamMinimal,
    });
    expect(result.errors.notes).toBeUndefined();
  });

  test.each(["5 mg", "0,5 mg", "125 mg/5 ml", "500mg"])("kekuatan %s diterima", (strength) => {
    expect(validateMedicineForm(filled({ strength })).ok).toBe(true);
  });

  test.each(["lima mg", "mg 5", "5"])("kekuatan %s ditolak", (strength) => {
    expect(validateMedicineForm(filled({ strength }))).toMatchObject({ ok: false, errors: { strength: FORM_OBAT.galatKekuatan } });
  });

  test("jam kosong atau sama ditandai per baris", () => {
    const result = validateMedicineForm(
      filled({
        times: [
          { key: "a", time: "07:00", checked: true },
          { key: "b", time: "07:00", checked: true },
          { key: "c", time: "", checked: true },
        ],
      }),
    );
    expect(result).toMatchObject({ ok: false, errors: { timeRows: { b: FORM_OBAT.galatJamSama, c: FORM_OBAT.galatJamKosong } } });
  });

  test("'Tidak ada larangan khusus' mengisi larangan secara tegas", () => {
    const result = validateMedicineForm(filled({ warnings: "", noWarnings: true }));
    expect(result.ok && result.value.warnings).toBe(DRAFT.tidakAdaLarangan);
  });

  test("teks terlalu panjang ditolak", () => {
    expect(validateMedicineForm(filled({ notes: "a".repeat(501) }))).toMatchObject({ ok: false, errors: { notes: FORM_OBAT.galatPanjang } });
  });
});
