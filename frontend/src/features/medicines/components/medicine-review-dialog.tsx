"use client";

import { Check, Pencil, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import { AI_GAGAL, DRAFT, FORM_OBAT, KONFIRMASI_SIMPAN_OBAT, LABEL, OBAT, SIMPAN_OBAT, TOMBOL, formatJamMinum, formatKekuatan } from "@/shared/copy";
import { Bacakan, Button, Dialog, Notice, Spinner } from "@/shared/ui";
import type { ReviewedExplanation } from "../api/medicines";
import type { MedicineFormOutput } from "../schemas/medicine-form";

export type MedicineReview = { input: MedicineFormOutput; reviewed: ReviewedExplanation };

export function MedicineReviewDialog({ review, saving, error, onConfirm, onEdit, returnFocusRef, title = SIMPAN_OBAT.periksaJudul }: {
  review: MedicineReview;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onEdit: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  title?: string;
}) {
  const { input, reviewed } = review;
  const rows = [
    { label: FORM_OBAT.namaObat, value: `${input.name} ${formatKekuatan(input.strength)}` },
    { label: OBAT.jumlahPerMinum, value: input.doseAmount },
    { label: OBAT.jamMinum, value: formatJamMinum(input.intakeTimes) },
    { label: OBAT.aturanPakai, value: input.usageRule },
    { label: LABEL.kegunaanObat, value: input.purpose },
    { label: OBAT.larangan, value: input.warnings },
    ...(input.notes ? [{ label: OBAT.catatanPribadi, value: input.notes }] : []),
    { label: SIMPAN_OBAT.sumber, value: input.labelSource === "apoteker" ? LABEL.diisiApoteker : LABEL.diisiKeluarga },
  ];
  // Pratinjau ini masih harus diperiksa pengisi: jangan menambahkan label "telah diperiksa".
  const reading = [title, KONFIRMASI_SIMPAN_OBAT, SIMPAN_OBAT.dataAsli,
    ...rows.flatMap(({ label, value }) => [label, value]),
    ...(reviewed.explanationOrigin === "ai_dikonfirmasi" ? [SIMPAN_OBAT.penjelasanAi, reviewed.explanation] : [AI_GAGAL, DRAFT.penjelasanBelumTersedia, SIMPAN_OBAT.tanpaAi]),
    ...(error ? [error] : []),
  ].join("\n");

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open && !saving) onEdit(); }}
      title={title}
      description={KONFIRMASI_SIMPAN_OBAT}
      returnFocusRef={returnFocusRef}
      dismissOnOutsideClick={false}
      actions={
        <>
          <Button variant="brand" icon={<Check />} onClick={onConfirm} disabled={saving} aria-busy={saving}>
            {TOMBOL.yaSudahBenar}
          </Button>
          <Button variant="secondary" icon={<Pencil />} onClick={onEdit} disabled={saving}>
            {TOMBOL.perbaikiLagi}
          </Button>
        </>
      }
    >
      <section className="flex flex-col gap-3 rounded-card border-2 border-line bg-canvas p-3.5">
        <h3 className="text-body font-bold text-ink-secondary">{SIMPAN_OBAT.dataAsli}</h3>
        <dl className="flex flex-col gap-2 text-body">
          {rows.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-2 items-start gap-3">
              <dt className="text-ink-secondary">{label}</dt>
              <dd className="min-w-0 font-bold break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {reviewed.explanationOrigin === "ai_dikonfirmasi" ? (
        <section className="flex flex-col gap-2 rounded-card border-2 border-brand-border bg-brand-soft p-3.5">
          <h3 className="flex items-start gap-2 text-body font-bold text-brand-ink">
            <Sparkles aria-hidden="true" className="size-5 shrink-0" />
            {SIMPAN_OBAT.penjelasanAi}
          </h3>
          <p className="text-body font-semibold break-words">{reviewed.explanation}</p>
        </section>
      ) : (
        <>
          <Notice tone="info">{AI_GAGAL}</Notice>
          <Notice tone="plain">
            <p className="font-bold">{DRAFT.penjelasanBelumTersedia}</p>
            <p>{SIMPAN_OBAT.tanpaAi}</p>
          </Notice>
        </>
      )}
      <Bacakan text={reading} active={!saving} contextKey="medicine-review" />
      {saving ? <Spinner label={SIMPAN_OBAT.menyimpan} visibleLabel /> : null}
      {error ? <Notice tone="danger" role="alert">{error}</Notice> : null}
    </Dialog>
  );
}
