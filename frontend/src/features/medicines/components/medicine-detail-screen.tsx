"use client";

import { Pencil, Pill, Sparkles } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { medicineDetail, medicineEdit, outputPreferenceThen, ROUTES } from "@/shared/config";
import { AUTH, DRAFT, formatJamMinum, formatKekuatan, LABEL, OBAT, UBAH_OBAT } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { Button, Card, EmptyState, ErrorState, Notice, PageHeader, Skeleton, Spinner } from "@/shared/ui";
import type { Medicine } from "../api/medicines";
import { useMedicine } from "../hooks/use-medicines";
import { LabelSourceChip } from "./label-source-chip";
import { DeleteMedicineAction } from "./delete-medicine-action";

function Identity({ medicine }: { medicine: Medicine }) {
  return (
    <Card className="flex-row items-center gap-3.5 p-5">
      <span aria-hidden="true" className="flex size-15 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand">
        <Pill className="size-7.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <h2 className="text-display break-words">
          {medicine.name} {formatKekuatan(medicine.strength)}
        </h2>
        <LabelSourceChip source={medicine.labelSource} />
      </div>
    </Card>
  );
}

/**
 * Penjelasan AI hanya ada bila pengisi menekan "Ya, sudah benar". Tanpa itu
 * (AI gagal, D3) lansia membaca informasi asli pengisi di bawahnya.
 */
function Explanation({ medicine }: { medicine: Medicine }) {
  if (medicine.explanationOrigin !== "ai_dikonfirmasi" || medicine.explanation === null) {
    return <Notice tone="plain">{DRAFT.penjelasanBelumTersedia}</Notice>;
  }
  return (
    <Card className="gap-3 p-5">
      <p className="text-card-title font-medium leading-normal">{medicine.explanation}</p>
      <p className="flex items-center gap-2 text-small font-medium text-ink-secondary">
        <Sparkles aria-hidden="true" className="size-5 shrink-0 text-brand" />
        {OBAT.penjelasanDiperiksa}
      </p>
    </Card>
  );
}

function OriginalInfo({ medicine }: { medicine: Medicine }) {
  const rows = [
    { label: LABEL.kegunaanObat, value: medicine.purpose },
    { label: OBAT.aturanPakai, value: medicine.usageRule },
    { label: OBAT.jumlahPerMinum, value: medicine.doseAmount },
    { label: OBAT.jamMinum, value: formatJamMinum(medicine.intakeTimes) },
    { label: OBAT.larangan, value: medicine.warnings },
    ...(medicine.notes ? [{ label: OBAT.catatanPribadi, value: medicine.notes }] : []),
  ];
  return (
    <Card className="p-5">
      <dl className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <Fragment key={row.label}>
            {index > 0 ? <hr aria-hidden="true" className="h-0.5 border-0 bg-line" /> : null}
            <div className="flex flex-col gap-1">
              <dt className="text-small text-ink-secondary">{row.label}</dt>
              <dd className="text-body font-semibold break-words">{row.value}</dd>
            </div>
          </Fragment>
        ))}
      </dl>
    </Card>
  );
}

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
 * "Jadwal berikutnya" (data dosis, P05/P10) dan Bacakan (P12).
 */
export function MedicineDetailScreen({ id, updated = false }: { id: string; updated?: boolean }) {
  const medicine = useMedicine(id);

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
        <Identity medicine={medicine.data} />
        <Button asChild variant="secondary">
          <Link href={outputPreferenceThen(medicineDetail(id))}>{OBAT.ubahPilihanKeluaran}</Link>
        </Button>
        <h2 className="text-card-title">{OBAT.penjelasanSederhana}</h2>
        <Explanation medicine={medicine.data} />
        <h2 className="text-card-title">{OBAT.informasiAsli}</h2>
        <OriginalInfo medicine={medicine.data} />
        <Notice tone="plain">{OBAT.bukanSaranMedis}</Notice>
        <Button asChild variant="secondary" size="lg">
          <Link href={medicineEdit(id)}><Pencil aria-hidden="true" className="size-6" />{UBAH_OBAT.tombol}</Link>
        </Button>
        <p className="text-body text-ink-secondary">{UBAH_OBAT.petunjuk}</p>
        <DeleteMedicineAction medicine={medicine.data} />
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
