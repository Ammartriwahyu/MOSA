import Link from "next/link";
import type { RefObject } from "react";
import { scanForDose } from "@/shared/config";
import { CATAT_DOSIS, DASBOR, formatJam, formatKekuatan, tanggalDosis, TOMBOL } from "@/shared/copy";
import { Button, Dialog, Notice, Spinner } from "@/shared/ui";
import type { Dose } from "../schemas/todays-doses";

export function DosePickerDialog({ doses, loading, failed, onClose, returnFocusRef }: { doses: readonly Dose[]; loading: boolean; failed: boolean; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title={CATAT_DOSIS.pilihJadwal} description={CATAT_DOSIS.pilihKeterangan} returnFocusRef={returnFocusRef}
      actions={<Button variant="secondary" onClick={onClose}>{TOMBOL.batal}</Button>}>
      {loading ? <Spinner label={CATAT_DOSIS.memeriksa} visibleLabel /> : failed ? <Notice tone="danger" role="alert">{CATAT_DOSIS.gagalMuat}</Notice> : doses.length === 0 ? <Notice>{CATAT_DOSIS.tidakAdaPilihan}</Notice> : (
        <ul className="flex flex-col gap-3">
          {doses.map((dose) => <li key={dose.slotId}><Link href={scanForDose(dose.slotId)} className="flex min-h-action-lg flex-col gap-1 rounded-card border-2 border-line bg-canvas p-4 text-body [overflow-wrap:anywhere]">
            <span className="text-card-title">{dose.medicine.name} {formatKekuatan(dose.medicine.strength)}</span>
            <span>{tanggalDosis(dose.scheduledDate)} · {formatJam(dose.scheduledTime)} {DASBOR.wib}</span>
          </Link></li>)}
        </ul>
      )}
    </Dialog>
  );
}
