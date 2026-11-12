import { Camera } from "lucide-react";
import Link from "next/link";
import { scanForDose } from "@/shared/config";
import { CATAT_DOSIS } from "@/shared/copy";
import { Button } from "@/shared/ui";
import type { Dose } from "../schemas/todays-doses";

export type DoseActionHandler = (dose: Dose, trigger: HTMLButtonElement) => void;
export type DoseActionProps = { onConfirm?: DoseActionHandler; actionsDisabled?: boolean };

export function DoseActions({ dose, onConfirm, actionsDisabled = false }: DoseActionProps & { dose: Dose }) {
  if (dose.status !== "jatuh_tempo") return null;
  return (
    <div className="flex flex-col gap-2.5">
      {actionsDisabled ? <Button size="lg" icon={<Camera />} disabled>{CATAT_DOSIS.scanDosis}</Button> : (
        <Button asChild size="lg"><Link href={scanForDose(dose.slotId)}><Camera aria-hidden="true" className="size-6 shrink-0" />{CATAT_DOSIS.scanDosis}</Link></Button>
      )}
      {onConfirm ? <Button size="lg" variant="secondary" disabled={actionsDisabled} onClick={(event) => onConfirm(dose, event.currentTarget)}>{CATAT_DOSIS.tanpaScan}</Button> : null}
    </div>
  );
}
