"use client";

import { Check, CheckCheck, Info, Pill } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { OutputPreferenceChoice, type OutputMode } from "@/features/preferences";
import { ROUTES } from "@/shared/config";
import { CATAT_DOSIS, KONFIRMASI_MINUM, LABEL_STATUS, PREFERENSI, SCAN_CAPTURE, SCAN_CONFIRM, TOMBOL, formatKekuatan, jadwalTargetScan, waktuPencatatanDosis } from "@/shared/copy";
import { Button, Dialog, Notice, Spinner } from "@/shared/ui";
import { useScanConfirmation } from "../hooks/use-scan-confirmation";
import { scanConsentQueryKey } from "../hooks/use-scan-consent";
import type { ScanResponse } from "../schemas/scan-response";
import { ScanOutcomeView } from "./scan-outcome-view";

export function ScanResultFlow({ result, onAgain, outputMode, userId }: {
  result: ScanResponse; onAgain: () => void; outputMode: OutputMode | null; userId: string;
}) {
  const confirmation = useScanConfirmation(result);
  const router = useRouter(); const client = useQueryClient();
  const [preferenceDone, setPreferenceDone] = useState(false);
  const receiptTitle = useRef<HTMLHeadingElement>(null);
  const preferenceTitle = useRef<HTMLHeadingElement>(null);
  const { state, selected, expired, checking } = confirmation;
  const needsPreference = "medicine" in result && outputMode === null && !preferenceDone;
  useEffect(() => { if (state.phase === "saved") receiptTitle.current?.focus(); }, [state.phase]);
  useEffect(() => { if (needsPreference) preferenceTitle.current?.focus(); }, [needsPreference]);
  function leave() { confirmation.close(); onAgain(); router.push(ROUTES.home); }
  const again = () => { confirmation.close(); onAgain(); };
  if (needsPreference) return <>
    <h1 ref={preferenceTitle} tabIndex={-1} className="flex min-h-touch items-center justify-center text-center text-section outline-none">{PREFERENSI.judulLayar}</h1>
    <OutputPreferenceChoice outputMode={null} continueToResult onSaved={() => {
      setPreferenceDone(true);
      void client.invalidateQueries({ queryKey: scanConsentQueryKey(userId) });
    }} />
    <Button variant="secondary" size="lg" onClick={leave}>{SCAN_CAPTURE.backToSchedule}</Button>
  </>;
  if (state.phase === "saved") return <>
    <h1 ref={receiptTitle} tabIndex={-1} className="text-display outline-none">{SCAN_CONFIRM.saved}</h1>
    <Notice tone="brand" role="status"><p className="flex items-center gap-2 font-bold"><CheckCheck aria-hidden="true" className="size-7 shrink-0" />{LABEL_STATUS.sudahScan}</p>
      {"medicine" in result ? <p className="[overflow-wrap:anywhere]">{result.medicine.name} {formatKekuatan(result.medicine.strength)}</p> : null}
      <p>{jadwalTargetScan(state.receipt.confirmation.scheduledDate, state.receipt.confirmation.scheduledTime)}</p>
      <p>{waktuPencatatanDosis(state.receipt.confirmation.confirmedAt)}</p>
    </Notice>
    <Button asChild size="lg" variant="brand"><Link href={ROUTES.home}>{SCAN_CAPTURE.backToSchedule}</Link></Button>
  </>;
  const error = state.phase === "error" ? SCAN_CONFIRM[state.reason] : expired ? SCAN_CONFIRM.expired : null;
  const busy = state.phase === "pending";
  return <>
    <ScanOutcomeView result={result} onAgain={again} onContinue={confirmation.open} confirmationDisabled={busy || expired || state.phase === "error"} speechActive={!selected && !busy && !error} contextKey={userId} />
    {error && !selected ? <Notice tone="danger" role="alert">{error}</Notice> : null}
    {error && !selected ? <Button size="lg" onClick={again}>{SCAN_CONFIRM.rescan}</Button> : null}
    {selected && "medicine" in result ? <Dialog open title={KONFIRMASI_MINUM} icon={<Pill className="size-10" />} iconTone="brand" reserveCloseSpace={false}
      onOpenChange={(open) => { if (!open && !busy) leave(); }} dismissOnOutsideClick={false} closeDisabled={busy} returnFocusRef={confirmation.trigger}
      actions={<>
        <Button size="lg" variant="brand" icon={<Check />} disabled={busy || checking || Boolean(error)} aria-busy={busy} onClick={() => void confirmation.submit()}>{TOMBOL.sudahSayaMinum}</Button>
        {error ? <Button size="lg" onClick={again}>{SCAN_CONFIRM.rescan}</Button> : null}
        <Button size="lg" variant="secondary" disabled={busy} onClick={leave}>{TOMBOL.nantiDulu}</Button>
      </>}>
      <div className="rounded-card bg-brand-soft p-4 text-center text-body text-brand-ink [overflow-wrap:anywhere]">
        <p className="font-bold">{result.medicine.name} {formatKekuatan(result.medicine.strength)}</p><p>{jadwalTargetScan(selected.scheduledDate, selected.scheduledTime)}</p>
        <p>{result.medicine.doseAmount} · {result.medicine.usageRule}</p>
      </div>
      <Notice tone="brand" icon={<Info className="size-6" />}>{SCAN_CONFIRM.hint}</Notice>
      {busy || checking ? <Spinner label={busy ? SCAN_CONFIRM.saving : CATAT_DOSIS.memeriksa} visibleLabel /> : null}
      {error ? <Notice tone="danger" role="alert">{error}</Notice> : null}
    </Dialog> : null}
  </>;
}
