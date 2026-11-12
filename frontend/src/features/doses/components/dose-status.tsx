import { Check, CheckCheck, CircleAlert, Clock } from "lucide-react";
import { DOSIS, LABEL_STATUS } from "@/shared/copy";
import { Badge } from "@/shared/ui";
import type { Dose } from "../schemas/todays-doses";

/** Status berasal dari server; waktu perangkat tidak dipakai untuk mengubahnya. */
export function DoseStatus({ dose }: { dose: Dose }) {
  if (dose.status === "sudah") {
    return dose.confirmation?.level === "scan_terverifikasi"
      ? <Badge tone="success" icon={<CheckCheck />}>{LABEL_STATUS.sudahScan}</Badge>
      : <Badge tone="success-subtle" icon={<Check />}>{LABEL_STATUS.sudahTanpaScan}</Badge>;
  }
  if (dose.status === "terlewat") return <Badge tone="danger" icon={<CircleAlert />}>{LABEL_STATUS.terlewat}</Badge>;
  return <Badge tone={dose.status === "jatuh_tempo" ? "due" : "pending"} icon={<Clock />}>{dose.status === "jatuh_tempo" ? DOSIS.belumJatuhTempo : LABEL_STATUS.belum}</Badge>;
}
