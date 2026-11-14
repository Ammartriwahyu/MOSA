"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ROUTES } from "@/shared/config";
import { OBAT, TOMBOL, UBAH_OBAT, formatKekuatan } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { Button, Dialog, Notice, Spinner } from "@/shared/ui";
import type { Medicine } from "../api/medicines";
import { useDeactivateMedicine } from "../hooks/use-medicines";

export function DeleteMedicineAction({ medicine, onDialogChange }: { medicine: Medicine; onDialogChange?: (open: boolean) => void }) {
  const router = useRouter();
  const deactivate = useDeactivateMedicine(medicine.id);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);
  const triggerGroup = useRef<HTMLDivElement>(null);
  const busy = deactivate.isPending || done;

  function changeOpen(next: boolean) {
    if (inFlight.current || done) return;
    setError(null);
    setMissing(false);
    setOpen(next);
    onDialogChange?.(next);
  }

  async function confirm() {
    if (inFlight.current || done || !open || missing) return;
    inFlight.current = true;
    setError(null);
    try {
      await deactivate.mutateAsync();
      setDone(true);
      router.replace(`${ROUTES.medicines}?removed=1`);
    } catch (failure) {
      const notFound = isApiError(failure, "NOT_FOUND");
      setMissing(notFound);
      setError(notFound ? OBAT.tidakDitemukanPesan : UBAH_OBAT.galatHapus);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div ref={triggerGroup} role="group" aria-label={UBAH_OBAT.hapus} tabIndex={-1}>
      <Button variant="danger-outline" size="lg" icon={<Trash2 />} onClick={() => changeOpen(true)} disabled={busy}>
        {UBAH_OBAT.hapus}
      </Button>
      <Dialog
        open={open}
        onOpenChange={changeOpen}
        title={UBAH_OBAT.hapusJudul}
        description={UBAH_OBAT.hapusPenjelasan}
        icon={<Trash2 className="size-9.5" />}
        iconTone="danger"
        dismissOnOutsideClick={false}
        returnFocusRef={triggerGroup}
        actions={<>
          <Button variant="danger" size="lg" icon={<Trash2 />} onClick={() => void confirm()} disabled={busy || missing} aria-busy={busy}>
            {UBAH_OBAT.yaHapus}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => changeOpen(false)} disabled={busy}>{TOMBOL.batal}</Button>
        </>}
      >
        <p className="text-center text-card-title break-words">{medicine.name} {formatKekuatan(medicine.strength)}</p>
        {busy ? <Spinner label={UBAH_OBAT.menghapus} visibleLabel /> : null}
        {error ? <Notice tone="danger" role="alert">
          <p>{error}</p>
          {missing ? <Link href={ROUTES.medicines} className="inline-flex min-h-touch items-center font-bold underline">{OBAT.kembaliKeDaftar}</Link> : null}
        </Notice> : null}
      </Dialog>
    </div>
  );
}
