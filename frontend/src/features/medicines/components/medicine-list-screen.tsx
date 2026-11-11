"use client";

import { ChevronRight, Pill, Plus } from "lucide-react";
import Link from "next/link";
import { medicineDetail, ROUTES } from "@/shared/config";
import { AUTH, formatJamMinum, formatKekuatan, jumlahObatTerdaftar, OBAT } from "@/shared/copy";
import { Button, EmptyState, ErrorState, PageHeader, Skeleton, Spinner } from "@/shared/ui";
import type { Medicine } from "../api/medicines";
import { useMedicines } from "../hooks/use-medicines";
import { LabelSourceChip } from "./label-source-chip";

function AddButton() {
  return (
    <Button asChild variant="brand" size="lg">
      <Link href={ROUTES.newMedicine}>
        <Plus aria-hidden="true" className="size-6" />
        {OBAT.tambahObat}
      </Link>
    </Button>
  );
}

function MedicineItem({ medicine }: { medicine: Medicine }) {
  return (
    <li>
      <Link
        href={medicineDetail(medicine.id)}
        className="flex items-center gap-3.5 rounded-card bg-surface p-4.5 shadow-card"
      >
        <span aria-hidden="true" className="flex size-13 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand">
          <Pill className="size-6.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <span className="text-card-title break-words">
            {medicine.name} {formatKekuatan(medicine.strength)}
          </span>
          <span className="text-body text-ink-secondary">
            {medicine.doseAmount} · {formatJamMinum(medicine.intakeTimes)}
          </span>
          <LabelSourceChip source={medicine.labelSource} />
        </span>
        <ChevronRight aria-hidden="true" className="size-6.5 shrink-0 text-ink" />
      </Link>
    </li>
  );
}

function LoadingList() {
  return (
    <>
      <Spinner />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-32 rounded-card" />
      ))}
    </>
  );
}

/** Daftar Obat (Figma MOSA DRAFT 16 · 135:4138): obat aktif milik akun, terurut saat dibuat. */
export function MedicineListScreen() {
  const medicines = useMedicines();

  return (
    <>
      <PageHeader title={OBAT.judulDaftar} />
      {medicines.isPending ? (
        <LoadingList />
      ) : medicines.isError ? (
        <ErrorState
          title={AUTH.galatUmum}
          action={
            <Button variant="secondary" onClick={() => void medicines.refetch()}>
              {AUTH.cobaLagi}
            </Button>
          }
        />
      ) : medicines.data.length === 0 ? (
        <EmptyState
          icon={<Pill className="size-10" />}
          title={OBAT.kosongJudul}
          message={OBAT.kosongPesan}
          action={<AddButton />}
        />
      ) : (
        <>
          <AddButton />
          <p className="text-body font-semibold text-ink-secondary">{jumlahObatTerdaftar(medicines.data.length)}</p>
          <ul className="flex flex-col gap-4">
            {medicines.data.map((medicine) => (
              <MedicineItem key={medicine.id} medicine={medicine} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
