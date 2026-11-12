"use client";

import { Pencil, Pill } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { medicineDetail, medicineEdit, outputPreferenceThen, ROUTES } from "@/shared/config";
import { AUTH, OBAT, UBAH_OBAT } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { Bacakan, Button, EmptyState, ErrorState, Notice, PageHeader, Skeleton, Spinner } from "@/shared/ui";
import { useMedicine } from "../hooks/use-medicines";
import { MedicineIdentity, MedicineExplanation, MedicineOriginalInfo, medicineInformationText } from "./medicine-information";
import { DeleteMedicineAction } from "./delete-medicine-action";

function LoadingDetail() {
  return (
    <>
      <Spinner />
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </>
  );
}

function BackToList() {
  return (
    <Button asChild variant="secondary">
      <Link href={ROUTES.medicines}>{OBAT.kembaliKeDaftar}</Link>
    </Button>
  );
}

/**
 * Detail Obat (Figma MOSA DRAFT 21 · 135:4576). Bagian Figma yang menyusul:
 * "Jadwal berikutnya" masih menggunakan sumber data dosis terpisah (P05/P10).
 */
export function MedicineDetailScreen({ id, updated = false }: { id: string; updated?: boolean }) {
  const medicine = useMedicine(id);
  const [deleting, setDeleting] = useState(false);

  let body;
  if (medicine.isPending) {
    body = <LoadingDetail />;
  } else if (medicine.isError) {
    body =
      isApiError(medicine.error, "NOT_FOUND") ? (
        <EmptyState icon={<Pill className="size-10" />} title={OBAT.tidakDitemukan} message={OBAT.tidakDitemukanPesan} action={<BackToList />} />
      ) : (
        <ErrorState
          title={AUTH.galatUmum}
          action={
            <Button variant="secondary" onClick={() => void medicine.refetch()}>
              {AUTH.cobaLagi}
            </Button>
          }
        />
      );
  } else {
    body = (
      <>
        {updated ? <Notice tone="brand" role="status">{UBAH_OBAT.berhasil}</Notice> : null}
        <MedicineIdentity medicine={medicine.data} />
        <Button asChild variant="secondary">
          <Link href={outputPreferenceThen(medicineDetail(id))}>{OBAT.ubahPilihanKeluaran}</Link>
        </Button>
        <h2 className="text-card-title">{OBAT.penjelasanSederhana}</h2>
        <MedicineExplanation medicine={medicine.data} />
        <h2 className="text-card-title">{OBAT.informasiAsli}</h2>
        <MedicineOriginalInfo medicine={medicine.data} />
        <Notice tone="plain">{OBAT.bukanSaranMedis}</Notice>
        <Bacakan text={medicineInformationText(medicine.data)} active={!deleting} contextKey={id} />
        <Button asChild variant="secondary" size="lg">
          <Link href={medicineEdit(id)}><Pencil aria-hidden="true" className="size-6" />{UBAH_OBAT.tombol}</Link>
        </Button>
        <p className="text-body text-ink-secondary">{UBAH_OBAT.petunjuk}</p>
        <DeleteMedicineAction medicine={medicine.data} onDialogChange={setDeleting} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={OBAT.judulDetail} backHref={ROUTES.medicines} />
      {body}
    </>
  );
}
