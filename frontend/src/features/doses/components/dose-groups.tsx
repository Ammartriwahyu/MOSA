import { Moon, Sun, Sunrise } from "lucide-react";
import { DOSIS, formatJam, namaKelompokDosis, type KelompokWaktu } from "@/shared/copy";
import { StaggerItem, StaggerList } from "@/shared/motion";
import type { Dose, TodaysDoses } from "../schemas/todays-doses";
import { DoseCard } from "./dose-card";
import type { DoseActionProps } from "./dose-actions";

const PERIODS: readonly KelompokWaktu[] = ["pagi", "siang", "malam"];
const ICONS = { pagi: Sunrise, siang: Sun, malam: Moon } as const;
const bySchedule = (a: Dose, b: Dose) => a.scheduledAt.localeCompare(b.scheduledAt) || a.slotId.localeCompare(b.slotId);

function NearbyDoses({ doses, title, description, ...actions }: DoseActionProps & { doses: readonly Dose[]; title: string; description: string }) {
  if (doses.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-section">{title}</h2>
      <p className="text-body text-ink-secondary">{description}</p>
      <ul className="flex flex-col gap-3">
        {[...doses].sort(bySchedule).map((dose) => <li key={dose.slotId}><DoseCard dose={dose} showDate {...actions} /></li>)}
      </ul>
    </section>
  );
}

export function DoseGroups({ data, ...actions }: DoseActionProps & { data: TodaysDoses }) {
  const summaries = new Map(data.medicines.map((medicine) => [medicine.medicineId, medicine.summary]));
  return (
    <>
      <NearbyDoses doses={data.carryoverDoses} title={DOSIS.jadwalSebelumnya} description={DOSIS.lintasTanggal} {...actions} />
      {data.doses.length > 0 ? (
        <section aria-label={DOSIS.jadwalHariIni} className="flex flex-col gap-4">
          {PERIODS.map((period) => {
            const doses = data.doses.filter((dose) => dose.period === period).sort(bySchedule);
            if (doses.length === 0) return null;
            const Icon = ICONS[period];
            const times = [...new Set(doses.map((dose) => dose.scheduledTime))].map(formatJam).join(" · ");
            return (
              <section key={period} aria-label={namaKelompokDosis(period)} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-2">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface text-brand"><Icon className="size-5.5" /></span>
                  <h2 className="text-section">{namaKelompokDosis(period)}</h2>
                  <p className="text-body text-ink-secondary">{times}</p>
                </div>
                <StaggerList className="flex flex-col gap-3">
                  {doses.map((dose) => <StaggerItem key={dose.slotId}><DoseCard dose={dose} summary={summaries.get(dose.medicineId)} {...actions} /></StaggerItem>)}
                </StaggerList>
              </section>
            );
          })}
        </section>
      ) : null}
      <NearbyDoses doses={data.earlyDoses} title={DOSIS.jadwalDini} description={DOSIS.diniKeterangan} {...actions} />
    </>
  );
}
