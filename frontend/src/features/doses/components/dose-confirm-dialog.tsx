import { Check } from "lucide-react";
import { CATAT_DOSIS, DASBOR, formatJam, formatKekuatan, konfirmasiTanpaScan, tanggalDosis, TOMBOL } from "@/shared/copy";
import { Button, Chip, Dialog, Notice, Spinner } from "@/shared/ui";
import type { useDoseConfirmation } from "../hooks/use-dose-confirmation";

export function DoseConfirmDialog({ confirmation }: { confirmation: ReturnType<typeof useDoseConfirmation> }) {
  const { selected: dose, busy, checking, error, canConfirm } = confirmation;
  if (!dose) return null;
  return (
    <Dialog open title={CATAT_DOSIS.judul} description={konfirmasiTanpaScan({ nama: dose.medicine.name, kekuatan: dose.medicine.strength })}
      icon={<Check className="size-10" />} iconTone="brand" closeDisabled={busy}
      onOpenChange={(open) => { if (!open) confirmation.close(); }} returnFocusRef={confirmation.returnFocusRef} dismissOnOutsideClick={false}
      actions={<>
        <Button size="lg" variant="brand" icon={<Check />} disabled={!canConfirm} aria-busy={busy} onClick={() => void confirmation.submit()}>{TOMBOL.sudahSayaMinum}</Button>
        <Button size="lg" variant="secondary" disabled={busy} onClick={() => confirmation.close()}>{TOMBOL.batal}</Button>
      </>}
    >
      <div className="flex flex-col items-start gap-2 rounded-card bg-canvas p-4 text-body [overflow-wrap:anywhere]">
        <Chip tone="brand">{dose.medicine.name} {formatKekuatan(dose.medicine.strength)}</Chip>
        <p>{DASBOR.jadwal} <time dateTime={dose.scheduledAt}>{tanggalDosis(dose.scheduledDate)} · {formatJam(dose.scheduledTime)} {DASBOR.wib}</time></p>
        <p>{dose.medicine.doseAmount} · {dose.medicine.usageRule}</p>
      </div>
      <Notice tone="info">{CATAT_DOSIS.keterangan}</Notice>
      {busy || checking ? <Spinner label={busy ? CATAT_DOSIS.mencatat : CATAT_DOSIS.memeriksa} visibleLabel /> : null}
      {error ? <><Notice tone="danger" role="alert">{error}</Notice><Button variant="secondary" disabled={busy || checking} onClick={confirmation.recheck}>{CATAT_DOSIS.periksaJadwal}</Button></> : null}
    </Dialog>
  );
}
