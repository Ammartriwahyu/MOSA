import { Pill, Sparkles } from "lucide-react";
import { Fragment } from "react";
import { DRAFT, formatJamMinum, formatKekuatan, LABEL, OBAT } from "@/shared/copy";
import { Card, Notice } from "@/shared/ui";
import type { Medicine } from "../api/medicines";
import { LabelSourceChip } from "./label-source-chip";

export type MedicineSnapshot = Omit<Medicine, "intakeTimes" | "createdAt"> & { intakeTimes?: string[] };
export function MedicineIdentity({ medicine }: { medicine: MedicineSnapshot }) {
  return (
    <Card className="flex-row items-center gap-3.5 p-5">
      <span aria-hidden="true" className="flex size-15 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand">
        <Pill className="size-7.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <h2 className="max-w-full text-display [overflow-wrap:anywhere]">
          {medicine.name} {formatKekuatan(medicine.strength)}
        </h2>
        <LabelSourceChip source={medicine.labelSource} />
      </div>
    </Card>
  );
}

export function MedicineExplanation({ medicine }: { medicine: MedicineSnapshot }) {
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

function originalRows(medicine: MedicineSnapshot) {
  return [
    { label: LABEL.kegunaanObat, value: medicine.purpose },
    { label: OBAT.aturanPakai, value: medicine.usageRule },
    { label: OBAT.jumlahPerMinum, value: medicine.doseAmount },
    ...(medicine.intakeTimes ? [{ label: OBAT.jamMinum, value: formatJamMinum(medicine.intakeTimes) }] : []),
    { label: OBAT.larangan, value: medicine.warnings },
    ...(medicine.notes ? [{ label: OBAT.catatanPribadi, value: medicine.notes }] : []),
  ];
}

export function medicineInformationText(medicine: MedicineSnapshot, schedule: readonly string[] = []) {
  const checked = medicine.explanationOrigin === "ai_dikonfirmasi" && medicine.explanation !== null;
  return [
    `${medicine.name} ${formatKekuatan(medicine.strength)}`,
    medicine.labelSource === "apoteker" ? LABEL.diisiApoteker : LABEL.diisiKeluarga,
    ...schedule,
    OBAT.penjelasanSederhana,
    ...(checked ? [medicine.explanation, OBAT.penjelasanDiperiksa] : [DRAFT.penjelasanBelumTersedia]),
    OBAT.informasiAsli,
    ...originalRows(medicine).flatMap(({ label, value }) => [label, value]),
    OBAT.bukanSaranMedis,
  ].join("\n");
}

export function MedicineOriginalInfo({ medicine }: { medicine: MedicineSnapshot }) {
  const rows = originalRows(medicine);
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

