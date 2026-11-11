"use client";

import { ROUTES } from "@/shared/config";
import { useCreateMedicine } from "../hooks/use-medicines";
import { emptyMedicineForm } from "../schemas/medicine-form";
import { MedicineEditor } from "./medicine-editor";

export function AddMedicineScreen() {
  const create = useCreateMedicine();
  return <MedicineEditor initialValues={emptyMedicineForm()} mode="create" saving={create.isPending} onSave={create.mutateAsync} backHref={ROUTES.medicines} />;
}
