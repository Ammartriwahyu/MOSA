import { Clock } from "lucide-react";
import { MedicineExplanation, MedicineIdentity, MedicineOriginalInfo } from "@/features/medicines";
import { DASBOR, OBAT, jadwalBerikutnya, jadwalTargetScan } from "@/shared/copy";
import { Card, Notice } from "@/shared/ui";
import type { ScanResponse } from "../schemas/scan-response";

type MatchedResult = Extract<ScanResponse, { medicine: unknown }>;

/** Seluruh informasi berasal dari snapshot server yang sudah dicocokkan, tanpa menampilkan bacaan AI mentah. */
export function ScanMedicineInfo({ result }: { result: MatchedResult }) {
  return <>
    <MedicineIdentity medicine={result.medicine} />
    <Card tone="brand" className="p-5">
      <h2 className="flex items-center gap-2 text-body font-semibold text-brand-ink"><Clock aria-hidden="true" className="size-6 shrink-0" />{DASBOR.jadwalBerikutnya}</h2>
      <p className="text-section">{jadwalBerikutnya(result.nextDose)}</p>
      {result.nextDose ? <p className="text-body">{jadwalTargetScan(result.nextDose.scheduledDate, result.nextDose.scheduledTime)}</p> : null}
    </Card>
    <h2 className="text-card-title">{OBAT.penjelasanSederhana}</h2>
    <MedicineExplanation medicine={result.medicine} />
    <h2 className="text-card-title">{OBAT.informasiAsli}</h2>
    <MedicineOriginalInfo medicine={result.medicine} />
    <Notice tone="plain">{OBAT.bukanSaranMedis}</Notice>
  </>;
}
