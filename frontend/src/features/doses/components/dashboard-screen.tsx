"use client";

import { Settings } from "lucide-react";
import { ROUTES } from "@/shared/config";
import { AUTH, DASBOR, DRAFT, NAMA_APLIKASI } from "@/shared/copy";
import { Button, ErrorState, IconLink, Skeleton, Spinner } from "@/shared/ui";
import { useTodaysDoses } from "../hooks/use-todays-doses";
import { DashboardContent } from "./dashboard-content";

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-page break-words text-brand">{NAMA_APLIKASI}</h1>
        <p className="text-body font-semibold">{DASBOR.sapaan}</p>
      </div>
      <IconLink href={ROUTES.settings} label={DRAFT.pengaturan} icon={<Settings />} />
    </header>
  );
}

export function DashboardScreen() {
  const doses = useTodaysDoses();
  return (
    <>
      <DashboardHeader />
      {doses.isError || doses.fetchStatus === "paused" ? (
        <ErrorState title={DASBOR.galatJudul} message={DASBOR.galatPesan} action={
          <Button variant="secondary" onClick={() => void doses.refetch()} disabled={doses.isFetching}>{AUTH.cobaLagi}</Button>
        } />
      ) : doses.isPending ? (
        <><Spinner label={DASBOR.memuat} visibleLabel /><Skeleton className="h-12" /><Skeleton className="h-64 rounded-card" /><Skeleton className="h-36 rounded-card" /></>
      ) : <DashboardContent data={doses.data} />}
    </>
  );
}
