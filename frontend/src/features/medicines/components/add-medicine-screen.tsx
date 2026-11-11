"use client";

import { useState } from "react";
import { ROUTES } from "@/shared/config";
import { OBAT } from "@/shared/copy";
import { PageHeader } from "@/shared/ui";
import { emptyMedicineForm } from "../schemas/medicine-form";
import { MedicineForm } from "./medicine-form";

/**
 * Tambah Obat (Figma 17). Isian disimpan di sini, bukan di formulir, agar
 * "Perbaiki lagi" bisa kembali tanpa kehilangan isian (docs/01 §2).
 */
export function AddMedicineScreen() {
  const [values, setValues] = useState(emptyMedicineForm);

  // Isian lolos validasi. Alur lanjutan (penjelasan AI → pop-up "Ya, sudah benar"
  // → simpan) dipasang di feat/medicines-explain-confirm.
  const handleValid = () => undefined;

  return (
    <>
      <PageHeader title={OBAT.tambahObat} backHref={ROUTES.medicines} />
      <MedicineForm values={values} onValuesChange={setValues} onValid={handleValid} />
    </>
  );
}
