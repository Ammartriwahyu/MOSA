import { Pill } from "lucide-react";
import { LabelSourceChip } from "@/features/medicines";
import { DASBOR, DOSIS, formatJam, formatKekuatan, labelKartuDosis, progresDosis, tanggalDosis, waktuPencatatanDosis } from "@/shared/copy";
import { Card, Chip, cx } from "@/shared/ui";
import type { Dose, TodaysDoses } from "../schemas/todays-doses";
import { DoseStatus } from "./dose-status";

export function DoseCard({ dose, summary, showDate = false }: { dose: Dose; summary?: TodaysDoses["summary"]; showDate?: boolean }) {
  const { medicine } = dose;
  return (
    <Card
      as="article"
      tone={dose.status === "jatuh_tempo" ? "due" : "default"}
      aria-label={labelKartuDosis({ nama: medicine.name, kekuatan: medicine.strength, date: dose.scheduledDate, jam: dose.scheduledTime })}
      className={cx("min-w-0 [overflow-wrap:anywhere]", dose.status === "terlewat" && "border-3 border-danger-border-soft")}
    >
      <div className="flex items-start gap-3.5">
        <span aria-hidden="true" className="flex size-13 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand"><Pill className="size-6.5" /></span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <h3 className="text-title">{medicine.name} {formatKekuatan(medicine.strength)}</h3>
          <p className="text-body text-ink-secondary">{medicine.doseAmount} · {medicine.usageRule} · {formatJam(dose.scheduledTime)}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-1.5">
            {summary ? <Chip>{progresDosis(summary.confirmed, summary.total)}</Chip> : null}
            <LabelSourceChip source={medicine.labelSource} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DoseStatus dose={dose} />
        <p className="text-body font-semibold text-ink-secondary">{DASBOR.jadwal} <time dateTime={dose.scheduledAt}>{formatJam(dose.scheduledTime)} {DASBOR.wib}</time></p>
      </div>
      {showDate ? <p className="text-body text-ink-secondary"><time dateTime={dose.scheduledDate}>{tanggalDosis(dose.scheduledDate)}</time></p> : null}
      {dose.status === "belum_tiba" ? <p className="text-body text-ink-secondary">{DOSIS.belumWaktunya}</p> : null}
      {dose.status === "terlewat" ? <p className="text-body text-ink-secondary">{DOSIS.terlewatKeterangan}</p> : null}
      {dose.status === "sudah" && dose.confirmation ? <p className="text-body text-ink-secondary"><time dateTime={dose.confirmation.confirmedAt}>{waktuPencatatanDosis(dose.confirmation.confirmedAt)}</time></p> : null}
    </Card>
  );
}
