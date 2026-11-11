"use client";

import Link from "next/link";
import { medicineDetail, ROUTES } from "@/shared/config";
import { AUTH, OBAT, UBAH_OBAT } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { Button, ErrorState, PageHeader, Skeleton, Spinner } from "@/shared/ui";
import { useMedicine, useUpdateMedicine } from "../hooks/use-medicines";
import { medicineToFormValues } from "../schemas/medicine-edit";
import { MedicineEditor } from "./medicine-editor";

/** MOSA DRAFT B7: semua edit melewati pemilihan sumber, explain, dan konfirmasi ulang. */
export function EditMedicineScreen({ id }: { id: string }) {
  const medicine = useMedicine(id);
  const update = useUpdateMedicine(id);

  if (medicine.data === undefined) {
    return <>
      <PageHeader title={UBAH_OBAT.judul} backHref={ROUTES.medicines} />
      {medicine.isPending ? <><Spinner /><Skeleton className="h-72 rounded-card" /></> :
        isApiError(medicine.error, "NOT_FOUND") ?
          <ErrorState title={OBAT.tidakDitemukan} message={OBAT.tidakDitemukanPesan} action={<Button asChild variant="secondary"><Link href={ROUTES.medicines}>{OBAT.kembaliKeDaftar}</Link></Button>} /> :
          <ErrorState title={AUTH.galatUmum} action={<Button variant="secondary" onClick={() => void medicine.refetch()}>{AUTH.cobaLagi}</Button>} />}
    </>;
  }
  return <MedicineEditor key={id} initialValues={medicineToFormValues(medicine.data)} mode="edit" saving={update.isPending} onSave={update.mutateAsync} backHref={medicineDetail(id)} />;
}
