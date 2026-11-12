import { Camera, Check, CheckCheck, ChevronRight, Clock, Info, Pill, Plus } from "lucide-react";
import Link from "next/link";
import { ROUTES, scanForDose } from "@/shared/config";
import { bannerJatuhTempo, DASBOR, formatJam, formatKekuatan, OBAT, progresDosis, TOMBOL, waktuJadwalDasbor } from "@/shared/copy";
import { Bacakan, Banner, Button, Card } from "@/shared/ui";
import type { Dose, TodaysDoses } from "../schemas/todays-doses";
import { DashboardDay } from "./dashboard-day";
import { DoseGroups } from "./dose-groups";
import type { DoseActionProps } from "./dose-actions";

function ScanButton({ due = [], onChooseScan, disabled = false }: { due?: readonly Dose[]; onChooseScan?: (trigger: HTMLButtonElement) => void; disabled?: boolean }) {
  const contents = <>
    <span aria-hidden="true" className="flex size-touch shrink-0 items-center justify-center rounded-field bg-surface text-action"><Camera className="size-6.5" /></span>
    <span className="min-w-0 flex-1 text-left">{TOMBOL.scanObat}</span>
    <span aria-hidden="true" className="flex shrink-0 -space-x-2.5"><ChevronRight className="size-5 opacity-40" /><ChevronRight className="size-5 opacity-70" /><ChevronRight className="size-5" /></span>
  </>;
  if (disabled || (due.length > 1 && onChooseScan)) return (
    <Button size="lg" className="justify-start gap-3.5 pl-2 pr-5.5" disabled={disabled} onClick={(event) => onChooseScan?.(event.currentTarget)}>{contents}</Button>
  );
  return (
    <Button asChild size="lg" className="justify-start gap-3.5 pl-2 pr-5.5">
      <Link href={due.length === 1 ? scanForDose(due[0].slotId) : ROUTES.scan}>{contents}</Link>
    </Button>
  );
}

function DailyProgress({ summary }: Pick<TodaysDoses, "summary">) {
  return (
    <Card aria-labelledby="daily-progress-title" className="gap-2 px-5 py-3.5">
      <h2 id="daily-progress-title" className="text-body font-semibold text-ink-secondary">{DASBOR.progresHariIni}</h2>
      <p className="text-section">{progresDosis(summary.confirmed, summary.total)}</p>
      <progress className="dose-progress h-2.5 w-full overflow-hidden rounded-pill" value={summary.confirmed} max={summary.total || 1} aria-label={DASBOR.progresHariIni} aria-valuetext={progresDosis(summary.confirmed, summary.total)} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-body text-ink-secondary">
        <span className="inline-flex items-center gap-1"><Check aria-hidden="true" className="size-5" />{DASBOR.tanpaScan}</span>
        <span className="inline-flex items-center gap-1"><CheckCheck aria-hidden="true" className="size-5" />{DASBOR.melaluiScan}</span>
      </p>
    </Card>
  );
}

function EmptyDashboard() {
  return (
    <>
      <Card className="items-center gap-3.5 p-7 text-center">
        <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-pill bg-brand-soft text-brand"><Pill className="size-12" /></span>
        <h2 className="text-page">{DASBOR.kosongJudul}</h2>
        <p className="text-body text-ink-secondary">{DASBOR.kosongPesan}</p>
        <Button asChild size="lg" variant="brand"><Link href={ROUTES.newMedicine}><Plus aria-hidden="true" className="size-6" />{DASBOR.tambahPertama}</Link></Button>
      </Card>
      <aside className="flex items-start gap-3 rounded-note bg-brand-soft p-4 text-body text-brand-ink">
        <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0" /><p>{DASBOR.tip}</p>
      </aside>
    </>
  );
}

/** Status dan hitungan hanya dibaca dari backend; pemilihan di sini untuk presentasi banner. */
export function DashboardContent({ data, onChooseScan, speechActive = true, ...actions }: DoseActionProps & { data: TodaysDoses; onChooseScan?: (trigger: HTMLButtonElement) => void; speechActive?: boolean }) {
  const empty = data.medicines.length === 0;
  const due = [...data.carryoverDoses, ...data.doses, ...data.earlyDoses].filter((dose) => dose.status === "jatuh_tempo");
  const next = data.medicines.flatMap((row) => row.nextDose ? [{ ...row.nextDose, medicineId: row.medicineId }] : []).sort((a, b) =>
    (a.tanggal === "hari_ini" ? 0 : 1) - (b.tanggal === "hari_ini" ? 0 : 1) || a.jam.localeCompare(b.jam),
  )[0];
  const bannerTitle = due.length === 1 ? bannerJatuhTempo(due[0].medicine.name) : DASBOR.beberapaDosis;
  const reading = due.length ? [DASBOR.waktunyaMinum, bannerTitle, ...due.flatMap((dose) => [
    ...(due.length > 1 ? [bannerJatuhTempo(dose.medicine.name)] : []),
    `${dose.medicine.name} ${formatKekuatan(dose.medicine.strength)} · ${dose.medicine.doseAmount}`,
    dose.medicine.usageRule,
    `${DASBOR.jadwal} ${formatJam(dose.scheduledTime)} ${DASBOR.wib}${dose.scheduledDate !== data.date ? ` · ${dose.scheduledDate}` : ""}`,
  ])] : [next ? DASBOR.jadwalBerikutnya : DASBOR.tidakAdaJadwalBerikutnya,
    ...(next ? [waktuJadwalDasbor(next)] : []), ...(data.summary.total === 0 ? [DASBOR.tidakAdaSlotHariIni] : [])];

  return (
    <div className="flex min-w-0 flex-col gap-3 [overflow-wrap:anywhere]">
      <DashboardDay date={data.date} serverTime={data.serverTime} calendar={empty} />
      {empty ? <EmptyDashboard /> : (
        <>
          {due.length > 0 ? (
            <Banner
              title={bannerTitle}
              eyebrow={<><Clock aria-hidden="true" className="size-5 shrink-0" />{DASBOR.waktunyaMinum}</>}
              actions={<><ScanButton due={due} onChooseScan={onChooseScan} disabled={actions.actionsDisabled} /><Bacakan text={reading.join("\n")} active={speechActive} contextKey={due.map((dose) => dose.slotId).join("|")} /></>}
            >
              <ul className="flex flex-col gap-3">
                {due.map((dose) => (
                  <li key={dose.slotId}>
                    {due.length > 1 ? <p className="font-bold">{bannerJatuhTempo(dose.medicine.name)}</p> : null}
                    <p>{dose.medicine.name} {formatKekuatan(dose.medicine.strength)} · {dose.medicine.doseAmount}</p>
                    <p>{dose.medicine.usageRule}</p>
                    <p>{DASBOR.jadwal} <time dateTime={dose.scheduledAt}>{formatJam(dose.scheduledTime)}</time> {DASBOR.wib}{dose.scheduledDate !== data.date ? ` · ${dose.scheduledDate}` : ""}</p>
                  </li>
                ))}
              </ul>
            </Banner>
          ) : (
            <section className="flex flex-col gap-3 rounded-card bg-brand-soft p-5 text-brand-ink" role="status">
              <h2 className="text-section">{next ? DASBOR.jadwalBerikutnya : DASBOR.tidakAdaJadwalBerikutnya}</h2>
              {next ? <p className="text-body">{waktuJadwalDasbor(next)}</p> : null}
              {data.summary.total === 0 ? <p className="text-body">{DASBOR.tidakAdaSlotHariIni}</p> : null}
              <ScanButton />
              <Bacakan text={reading.join("\n")} active={speechActive} contextKey={`${data.date}:${next?.medicineId}:${next?.tanggal}:${next?.jam}`} />
            </section>
          )}
          <DailyProgress summary={data.summary} />
          <Button asChild variant="secondary"><Link href={ROUTES.newMedicine}>{OBAT.tambahObat}</Link></Button>
          <DoseGroups data={data} {...actions} />
        </>
      )}
    </div>
  );
}
