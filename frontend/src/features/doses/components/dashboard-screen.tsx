"use client";

import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { ROUTES } from "@/shared/config";
import { AUTH, CATAT_DOSIS, catatanDosisBerhasil, DASBOR, DRAFT, NAMA_APLIKASI, OBAT } from "@/shared/copy";
import { Button, ErrorState, IconLink, Logo, Notice, Skeleton, Spinner } from "@/shared/ui";
import { useTodaysDoses } from "../hooks/use-todays-doses";
import { DashboardContent } from "./dashboard-content";
import { allDoses, useDoseConfirmation } from "../hooks/use-dose-confirmation";
import { DoseConfirmDialog } from "./dose-confirm-dialog";
import { DosePickerDialog } from "./dose-picker-dialog";

export function DashboardHeader({ focusRef }: { focusRef?: RefObject<HTMLHeadingElement | null> } = {}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* Dekoratif: nama aplikasi sudah tertulis di judul. Desktop: logo ada di navigasi samping. */}
        <Logo variant="aplikasi" height={48} alt="" className="shrink-0 lg:hidden" />
        <div className="min-w-0">
          <h1 ref={focusRef} tabIndex={-1} className="text-page break-words text-brand">{NAMA_APLIKASI}</h1>
          <p className="text-body font-semibold">{DASBOR.sapaan}</p>
        </div>
      </div>
      {/* Desktop (Figma 184:326): Tambah Obat di header; Pengaturan ada di navigasi samping. */}
      {/* Pembungkus yang disembunyikan: kelas `hidden` langsung pada Button kalah oleh inline-flex bawaannya. */}
      <div className="hidden shrink-0 lg:block">
        <Button asChild variant="brand" fullWidth={false}>
          <Link href={ROUTES.newMedicine}><Plus aria-hidden="true" className="size-6" />{OBAT.tambahObat}</Link>
        </Button>
      </div>
      <IconLink href={ROUTES.settings} label={DRAFT.pengaturan} icon={<Settings />} className="lg:hidden" />
    </header>
  );
}

export function DashboardScreen() {
  const doses = useTodaysDoses();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickerFocusRef = useRef<HTMLElement | null>(null);
  const [picking, setPicking] = useState(false);
  const confirmation = useDoseConfirmation(doses, headingRef);
  const healthy = doses.isSuccess && doses.fetchStatus !== "paused";
  const due = allDoses(doses.data).filter((dose) => dose.status === "jatuh_tempo");
  function closePicker() {
    if (!pickerFocusRef.current?.isConnected) pickerFocusRef.current = headingRef.current;
    setPicking(false);
  }
  return (
    <>
      <DashboardHeader focusRef={headingRef} />
      {confirmation.notice ? <Notice tone="info" role="status">
        {confirmation.notice.kind === "saved" ? <><p className="font-bold">{CATAT_DOSIS.berhasil}</p><p>{catatanDosisBerhasil({ nama: confirmation.notice.dose.medicine.name, kekuatan: confirmation.notice.dose.medicine.strength, date: confirmation.notice.dose.scheduledDate, jam: confirmation.notice.dose.scheduledTime })}</p></> : CATAT_DOSIS.sudahTercatat}
      </Notice> : null}
      {doses.isError || doses.fetchStatus === "paused" ? (
        <ErrorState title={DASBOR.galatJudul} message={DASBOR.galatPesan} action={
          <Button variant="secondary" onClick={() => void doses.refetch()} disabled={doses.isFetching}>{AUTH.cobaLagi}</Button>
        } />
      ) : doses.isPending ? (
        <><Spinner label={DASBOR.memuat} visibleLabel /><Skeleton className="h-12" /><Skeleton className="h-64 rounded-card" /><Skeleton className="h-36 rounded-card" /></>
      ) : confirmation.busy && confirmation.notice ? (
        <Spinner label={CATAT_DOSIS.memeriksa} visibleLabel />
      ) : <DashboardContent data={doses.data} onConfirm={confirmation.open} actionsDisabled={confirmation.busy} speechActive={!confirmation.selected && !picking && !confirmation.busy}
        onChooseScan={(trigger) => { pickerFocusRef.current = trigger; setPicking(true); void doses.refetch(); }} />}
      <DoseConfirmDialog confirmation={confirmation} />
      {picking ? <DosePickerDialog doses={healthy ? due : []} loading={doses.isFetching} failed={!healthy} onClose={closePicker} returnFocusRef={pickerFocusRef} /> : null}
    </>
  );
}
