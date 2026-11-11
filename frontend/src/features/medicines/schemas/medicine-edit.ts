import { DRAFT } from "@/shared/copy";
import type { Medicine } from "../api/medicines";
import { MAX_INTAKE_TIMES, PRESET_TIMES, type MedicineFormValues } from "./medicine-form";

/** PRD §19 #11: sumber dipilih ulang; penjelasan lama tidak masuk formulir. */
export function medicineToFormValues(medicine: Medicine): MedicineFormValues {
  const times = [...new Set([...medicine.intakeTimes, ...PRESET_TIMES])]
    .slice(0, MAX_INTAKE_TIMES)
    .sort()
    .map((time, index) => ({ key: `edit-${index}`, time, checked: medicine.intakeTimes.includes(time) }));
  return {
    labelSource: null,
    name: medicine.name,
    strength: medicine.strength,
    purpose: medicine.purpose,
    doseAmount: medicine.doseAmount,
    usageRule: medicine.usageRule,
    times,
    noWarnings: medicine.warnings === DRAFT.tidakAdaLarangan,
    warnings: medicine.warnings,
    notes: medicine.notes ?? "",
  };
}
