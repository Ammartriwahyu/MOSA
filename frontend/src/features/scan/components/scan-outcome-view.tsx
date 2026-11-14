"use client";

import { ArrowLeft, ArrowRight, Camera, Check, Clock, Package, Plus, SearchX, TriangleAlert, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LabelSourceChip } from "@/features/medicines";
import { ROUTES } from "@/shared/config";
import { OBAT, SCAN_CAPTURE, SCAN_CONFIRM, SCAN_OUTCOME, SCAN_REQUEST, formatKekuatan, jadwalTargetScan } from "@/shared/copy";
import type { ScanSlot } from "../hooks/use-scan-confirmation";
import { Bacakan, Button, Card, ChoiceCards, IconLink, Notice, cx } from "@/shared/ui";
import { scanOutcomeMessages } from "../lib/scan-outcome-message";
import type { ScanResponse } from "../schemas/scan-response";
import { ScanMedicineInfo } from "./scan-medicine-info";

const PRESENTATION = {
  tidak_terbaca: { title: SCAN_OUTCOME.unreadable, Icon: Package, tone: "warning" },
  tidak_terdaftar: { title: SCAN_OUTCOME.unregistered, Icon: SearchX, tone: "warning" },
  kekuatan_tidak_terbaca: { title: SCAN_OUTCOME.missingStrength, Icon: Package, tone: "warning" },
  kekuatan_beda: { title: SCAN_OUTCOME.differentStrength, Icon: TriangleAlert, tone: "danger" },
  tunggu_dulu: { title: SCAN_OUTCOME.wait, Icon: Clock, tone: "danger" },
  bisa_konfirmasi: { title: SCAN_OUTCOME.matched, Icon: Check, tone: "success" },
  dosis_sudah_tercatat: { title: SCAN_OUTCOME.recorded, Icon: Check, tone: "success" },
  hanya_info: { title: SCAN_OUTCOME.infoTitle, Icon: Package, tone: "success" },
} as const satisfies Record<ScanResponse["outcome"], { title: string; Icon: LucideIcon; tone: string }>;
const TONE = {
  warning: "border-warning-border bg-pending-soft text-warning",
  danger: "border-danger-border bg-danger-soft text-danger-strong",
  success: "border-success-border bg-success-soft text-success",
};

export function ScanOutcomeView({ result, onAgain, onContinue, confirmationDisabled = false, speechActive = true, contextKey = "scan" }: {
  result: ScanResponse; onAgain: () => void; onContinue?: (slot: ScanSlot, button: HTMLButtonElement) => void; confirmationDisabled?: boolean;
  speechActive?: boolean; contextKey?: string;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const showingInfo = result.outcome === "hanya_info" || infoOpen;
  const { title: outcomeTitle, Icon, tone } = PRESENTATION[result.outcome];
  const selected = result.outcome === "bisa_konfirmasi" && result.slots.length === 1 ? result.slots[0]!.slotId : chosenSlot;
  useEffect(() => { title.current?.focus(); }, [result, showingInfo]);
  const messages = scanOutcomeMessages(result, selected);
  const reading = [outcomeTitle, ...messages,
    ...(result.outcome === "tunggu_dulu" && result.nextDose ? [jadwalTargetScan(result.nextDose.scheduledDate, result.nextDose.scheduledTime)] : []),
    ...(result.outcome === "kekuatan_beda" ? [SCAN_OUTCOME.photographed, formatKekuatan(result.readStrength), SCAN_OUTCOME.registered, ...result.medicines.map((medicine) => `${medicine.name} ${formatKekuatan(medicine.strength)}`)] : []),
    ...(result.outcome === "bisa_konfirmasi" ? [SCAN_OUTCOME.matching, SCAN_OUTCOME.name, result.medicine.name, SCAN_OUTCOME.strength, formatKekuatan(result.medicine.strength),
      ...result.slots.filter((slot) => slot.slotId === selected).flatMap((slot) => [SCAN_OUTCOME.schedule, jadwalTargetScan(slot.scheduledDate, slot.scheduledTime)]), SCAN_OUTCOME.noNewDose] : []),
    ...(result.outcome === "dosis_sudah_tercatat" ? [SCAN_OUTCOME.noConfirmation, ...result.slots.map((slot) => jadwalTargetScan(slot.scheduledDate, slot.scheduledTime))] : []),
    ...(result.outcome === "tunggu_dulu" ? [SCAN_OUTCOME.currentMedicines, ...result.otherDueSlots.flatMap((slot) => [`${slot.medicine.name} ${formatKekuatan(slot.medicine.strength)}`, jadwalTargetScan(slot.scheduledDate, slot.scheduledTime)])] : []),
    ...(result.outcome === "tidak_terbaca" ? [SCAN_OUTCOME.goodPhoto, SCAN_OUTCOME.avoidLoosePills] : []),
  ].join("\n");
  return <div className="flex min-w-0 flex-col gap-4 [overflow-wrap:anywhere]">
    <header className="flex items-center justify-between gap-3">
      <IconLink href={ROUTES.home} label={SCAN_CAPTURE.backToSchedule} icon={<ArrowLeft />} />
      <h1 ref={title} tabIndex={-1} className="min-w-0 flex-1 text-center text-section outline-none">{showingInfo ? SCAN_OUTCOME.infoTitle : SCAN_OUTCOME.title}</h1>
      <span aria-hidden="true" className="size-touch shrink-0" />
    </header>
    {showingInfo && "medicine" in result ? <ScanMedicineInfo result={result} speechActive={speechActive} contextKey={`${contextKey}:info:${result.medicine.id}`} /> : <>
      <div className="flex flex-col items-center gap-3 py-1 text-center">
        <span aria-hidden="true" className={cx("flex size-24 items-center justify-center rounded-pill border-2", TONE[tone])}><Icon className={result.outcome === "bisa_konfirmasi" ? "size-13" : "size-12"} /></span>
        <h2 className={cx(result.outcome === "bisa_konfirmasi" ? "text-hero" : "text-display", tone === "danger" ? "text-danger-strong" : tone === "success" ? "text-success" : "text-warning")}>{outcomeTitle}</h2>
      </div>
      {result.outcome === "bisa_konfirmasi" && result.slots.length > 1 ? <ChoiceCards name="scan-slot" legend={SCAN_OUTCOME.chooseSlot}
        options={result.slots.map((slot) => ({ value: slot.slotId, title: jadwalTargetScan(slot.scheduledDate, slot.scheduledTime) }))}
        value={chosenSlot} onChange={setChosenSlot} /> : null}
      <section aria-live="polite" aria-atomic="true" className={cx("flex flex-col gap-3.5 rounded-card border-3 p-5", TONE[tone])}>
        {messages.map((message, index) => <p key={index} className="text-title font-semibold text-ink">{message}</p>)}
        {result.outcome === "tunggu_dulu" && result.nextDose ? <p className="text-body text-ink">{jadwalTargetScan(result.nextDose.scheduledDate, result.nextDose.scheduledTime)}</p> : null}
      </section>
      {result.outcome === "tidak_terbaca" ? <Card className="p-5">
        <p className="flex items-start gap-3 text-body"><Check aria-hidden="true" className="size-6 shrink-0 text-success" />{SCAN_OUTCOME.goodPhoto}</p>
        <p className="flex items-start gap-3 text-body"><X aria-hidden="true" className="size-6 shrink-0 text-danger" />{SCAN_OUTCOME.avoidLoosePills}</p>
      </Card> : null}
      {result.outcome === "kekuatan_beda" ? <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
        <Card className="min-w-0 border-2 border-danger-border p-4"><h3 className="text-body text-ink-secondary">{SCAN_OUTCOME.photographed}</h3><p className="text-card-title text-danger">{formatKekuatan(result.readStrength)}</p></Card>
        <Card className="min-w-0 border-2 border-success-border p-4"><h3 className="text-body text-ink-secondary">{SCAN_OUTCOME.registered}</h3>{result.medicines.map((medicine) => <p key={medicine.id} className="text-card-title text-success">{medicine.name} {formatKekuatan(medicine.strength)}</p>)}</Card>
      </div> : null}
      {result.outcome === "bisa_konfirmasi" ? <Card className="p-5"><h3 className="text-body font-bold">{SCAN_OUTCOME.matching}</h3>
        <dl className="flex flex-col gap-3 text-body">
          <div><dt className="text-ink-secondary">{SCAN_OUTCOME.name}</dt><dd>{result.medicine.name}</dd></div>
          <div><dt className="text-ink-secondary">{SCAN_OUTCOME.strength}</dt><dd>{formatKekuatan(result.medicine.strength)}</dd></div>
          {result.slots.filter((slot) => slot.slotId === selected).map((slot) => <div key={slot.slotId}><dt className="text-ink-secondary">{SCAN_OUTCOME.schedule}</dt><dd>{jadwalTargetScan(slot.scheduledDate, slot.scheduledTime)}</dd></div>)}
        </dl><LabelSourceChip source={result.medicine.labelSource} />
      </Card> : null}
      {result.outcome === "dosis_sudah_tercatat" ? <Card className="p-5"><h3 className="text-card-title">{SCAN_OUTCOME.noConfirmation}</h3>
        {result.slots.map((slot) => <p key={slot.slotId} className="text-body">{jadwalTargetScan(slot.scheduledDate, slot.scheduledTime)}</p>)}
      </Card> : null}
      {result.outcome === "tunggu_dulu" ? <Card className="p-5"><h3 className="text-body font-bold">{SCAN_OUTCOME.currentMedicines}</h3>
        {result.otherDueSlots.map((slot) => <div key={slot.slotId} className="text-body"><p className="font-bold">{slot.medicine.name} {formatKekuatan(slot.medicine.strength)}</p><p>{jadwalTargetScan(slot.scheduledDate, slot.scheduledTime)}</p></div>)}
      </Card> : null}
      <Bacakan text={reading} active={speechActive} contextKey={`${contextKey}:${result.serverTime}:${selected ?? "unselected"}`} />
    </>}
    {result.outcome === "bisa_konfirmasi" ? <Notice tone="plain">{SCAN_OUTCOME.noNewDose}</Notice> : null}
    {result.outcome === "bisa_konfirmasi" && onContinue ? <Button size="lg" variant="brand" icon={<ArrowRight />} disabled={!selected || confirmationDisabled}
      onClick={(event) => { const slot = result.slots.find((row) => row.slotId === selected); if (slot) onContinue(slot, event.currentTarget); }}>{SCAN_CONFIRM.continue}</Button> : null}
    {"medicine" in result && result.outcome !== "hanya_info" ? <Button size="lg" variant="secondary" onClick={() => setInfoOpen(!infoOpen)}>{infoOpen ? SCAN_OUTCOME.backToResult : SCAN_OUTCOME.viewInfo}</Button> : null}
    {result.outcome === "tidak_terdaftar" ? <Button asChild size="lg" variant="brand"><Link href={ROUTES.newMedicine}><Plus aria-hidden="true" className="size-6 shrink-0" />{OBAT.tambahObat}</Link></Button> : null}
    <Button size="lg" icon={<Camera className="size-6" />} onClick={onAgain}>{result.outcome === "kekuatan_beda" || result.outcome === "tunggu_dulu" ? SCAN_OUTCOME.correctPhoto : result.outcome === "tidak_terbaca" || result.outcome === "kekuatan_tidak_terbaca" ? SCAN_OUTCOME.retryPhoto : SCAN_REQUEST.again}</Button>
    <Button asChild size="lg" variant="secondary"><Link href={ROUTES.home}>{SCAN_CAPTURE.backToSchedule}</Link></Button>
  </div>;
}
