import { DRAFT, FORM_OBAT } from "@/shared/copy";

// Validasi formulir Tambah/Ubah Obat (docs/01 §2). Cermin aturan backend agar
// galat muncul di kolom sebelum dikirim; backend tetap pemeriksa terakhir.

/** Batas panjang sama dengan LIMITS di domain backend. */
export const FORM_LIMITS = {
  name: 100,
  strength: 30,
  purpose: 300,
  doseAmount: 50,
  usageRule: 300,
  warnings: 500,
  notes: 500,
} as const;

/** Jam minum: 1–6 jam "HH:mm" WIB, tanpa duplikat (docs/01 §2 isian #6). */
export const MAX_INTAKE_TIMES = 6;
/** Pilihan awal di Figma 17; jamnya bisa diubah. */
export const PRESET_TIMES = ["07:00", "12:00", "19:00"] as const;

export type LabelSource = "apoteker" | "keluarga";
export type TimeRow = { readonly key: string; readonly time: string; readonly checked: boolean };

export type MedicineFormValues = {
  labelSource: LabelSource | null;
  name: string;
  strength: string;
  purpose: string;
  usageRule: string;
  doseAmount: string;
  times: TimeRow[];
  noWarnings: boolean;
  warnings: string;
  notes: string;
};

/** Isian tervalidasi; bentuknya sama dengan body POST/PATCH /v1/medicines tanpa kolom penjelasan. */
export type MedicineFormOutput = {
  labelSource: LabelSource;
  name: string;
  strength: string;
  purpose: string;
  usageRule: string;
  doseAmount: string;
  intakeTimes: string[];
  warnings: string;
  notes: string | null;
};

type TextField = keyof typeof FORM_LIMITS;
export type FormField = TextField | "labelSource" | "times";
export type FormErrors = Partial<Record<FormField, string>> & { timeRows?: Record<string, string> };

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
// Angka lalu satuan: "5 mg", "0,5 mg", "125 mg/5 ml". Pembacaan pasti di backend (Strength).
const STRENGTH = /^\d+(?:[.,]\d+)?\s*[\p{L}%µ]/u;

export function emptyMedicineForm(): MedicineFormValues {
  return {
    labelSource: null,
    name: "",
    strength: "",
    purpose: "",
    usageRule: "",
    doseAmount: "",
    times: PRESET_TIMES.map((time) => ({ key: time, time, checked: false })),
    noWarnings: false,
    warnings: "",
    notes: "",
  };
}

function textError(value: string, max: number, required: boolean): string | undefined {
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return FORM_OBAT.galatWajib;
  if (trimmed.length > max) return FORM_OBAT.galatPanjang;
  return undefined;
}

function validateTimes(rows: TimeRow[]): Pick<FormErrors, "times" | "timeRows"> {
  const chosen = rows.filter((row) => row.checked);
  if (chosen.length === 0) return { times: FORM_OBAT.galatJamMinimal };

  const timeRows: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of chosen) {
    if (!HH_MM.test(row.time)) timeRows[row.key] = FORM_OBAT.galatJamKosong;
    else if (seen.has(row.time)) timeRows[row.key] = FORM_OBAT.galatJamSama;
    seen.add(row.time);
  }
  return Object.keys(timeRows).length > 0 ? { timeRows } : {};
}

/** Larangan wajib: isi sendiri atau centang "Tidak ada larangan khusus" (docs/01 §2 USULAN). */
export function warningsValue(values: Pick<MedicineFormValues, "noWarnings" | "warnings">): string {
  return values.noWarnings ? DRAFT.tidakAdaLarangan : values.warnings.trim();
}

export type ValidationResult =
  | { ok: true; value: MedicineFormOutput }
  | { ok: false; errors: FormErrors };

export function validateMedicineForm(values: MedicineFormValues): ValidationResult {
  const errors: FormErrors = {};
  if (values.labelSource === null) errors.labelSource = FORM_OBAT.galatSumber;

  const required: TextField[] = ["name", "strength", "purpose", "usageRule", "doseAmount"];
  for (const field of required) {
    const error = textError(values[field], FORM_LIMITS[field], true);
    if (error) errors[field] = error;
  }
  if (!errors.strength && !STRENGTH.test(values.strength.trim())) errors.strength = FORM_OBAT.galatKekuatan;

  const warnings = textError(values.noWarnings ? DRAFT.tidakAdaLarangan : values.warnings, FORM_LIMITS.warnings, true);
  if (warnings) errors.warnings = warnings;
  const notes = textError(values.notes, FORM_LIMITS.notes, false);
  if (notes) errors.notes = notes;

  Object.assign(errors, validateTimes(values.times));

  if (Object.keys(errors).length > 0 || values.labelSource === null) return { ok: false, errors };

  return {
    ok: true,
    value: {
      labelSource: values.labelSource,
      name: values.name.trim(),
      strength: values.strength.trim(),
      purpose: values.purpose.trim(),
      usageRule: values.usageRule.trim(),
      doseAmount: values.doseAmount.trim(),
      intakeTimes: values.times.filter((row) => row.checked).map((row) => row.time).sort(),
      warnings: warningsValue(values),
      notes: values.notes.trim() || null,
    },
  };
}
