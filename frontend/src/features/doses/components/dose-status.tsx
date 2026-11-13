"use client";

import { Check, CheckCheck, CircleAlert, Clock } from "lucide-react";
import { m } from "motion/react";
import { useState } from "react";
import { DOSIS, LABEL_STATUS } from "@/shared/copy";
import { TRANSITION } from "@/shared/motion";
import { Badge } from "@/shared/ui";
import type { Dose } from "../schemas/todays-doses";

/**
 * Lencana status dosis. Bila status berubah setelah tampil (mis. baru dikonfirmasi),
 * lencana "berdenyut" sekali dengan spring redam; saat halaman dimuat tidak bergerak.
 * Mulai dari opacity 0,4 sehingga status tidak pernah tersembunyi.
 */
export function DoseStatus({ dose }: { dose: Dose }) {
  const [firstStatus] = useState(dose.status);
  const changed = dose.status !== firstStatus;
  return (
    <m.span
      key={dose.status}
      className="inline-flex"
      initial={changed ? { opacity: 0.4, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={TRANSITION.spring}
    >
      <StatusBadge dose={dose} />
    </m.span>
  );
}

/** Status berasal dari server; waktu perangkat tidak dipakai untuk mengubahnya. */
function StatusBadge({ dose }: { dose: Dose }) {
  if (dose.status === "sudah") {
    return dose.confirmation?.level === "scan_terverifikasi"
      ? <Badge tone="success" icon={<CheckCheck />}>{LABEL_STATUS.sudahScan}</Badge>
      : <Badge tone="success-subtle" icon={<Check />}>{LABEL_STATUS.sudahTanpaScan}</Badge>;
  }
  if (dose.status === "terlewat") return <Badge tone="danger" icon={<CircleAlert />}>{LABEL_STATUS.terlewat}</Badge>;
  return <Badge tone={dose.status === "jatuh_tempo" ? "due" : "pending"} icon={<Clock />}>{dose.status === "jatuh_tempo" ? DOSIS.belumJatuhTempo : LABEL_STATUS.belum}</Badge>;
}
