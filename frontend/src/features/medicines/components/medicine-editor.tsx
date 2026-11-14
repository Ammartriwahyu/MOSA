"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { medicineDetail, ROUTES } from "@/shared/config";
import { AUTH, FORM_OBAT, OBAT, SIMPAN_OBAT, UBAH_OBAT } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { Button, ErrorState, Notice, PageHeader } from "@/shared/ui";
import type { CreateMedicineInput, Medicine } from "../api/medicines";
import { useExplainMedicine } from "../hooks/use-medicines";
import type { MedicineFormOutput, MedicineFormValues } from "../schemas/medicine-form";
import { MedicineForm } from "./medicine-form";
import { MedicineReviewDialog, type MedicineReview } from "./medicine-review-dialog";

const FALLBACK_CODES = new Set(["AI_UNAVAILABLE", "AI_QUOTA_EXCEEDED", "TIMEOUT", "NETWORK_ERROR", "INVALID_RESPONSE"]);

function PreparingExplanation() {
  return (
    <section role="status" className="flex min-h-[70dvh] flex-col items-center justify-center gap-5.5 text-center">
      <span aria-hidden="true" className="flex size-37.5 items-center justify-center rounded-pill border-8 border-brand bg-brand-soft text-brand">
        <Sparkles className="size-15" />
      </span>
      <h2 className="text-display">{SIMPAN_OBAT.menyiapkan}</h2>
      <p className="text-body text-ink-secondary">{SIMPAN_OBAT.prosesIsi}</p>
      <div aria-hidden="true" className="flex gap-2.5 motion-safe:animate-pulse">
        {["", "opacity-60", "opacity-30"].map((opacity) => <span key={opacity} className={`size-3.5 rounded-pill bg-brand ${opacity}`} />)}
      </div>
    </section>
  );
}

export function MedicineEditor({ initialValues, mode, saving, onSave, backHref }: {
  initialValues: MedicineFormValues;
  mode: "create" | "edit";
  saving: boolean;
  onSave: (input: CreateMedicineInput) => Promise<Medicine>;
  backHref: string;
}) {
  const router = useRouter();

  const [values, setValues] = useState(() => initialValues);
  const [review, setReview] = useState<MedicineReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState(false);
  const explain = useExplainMedicine();
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function handleValid(input: MedicineFormOutput) {
    if (inFlight.current || review || saved) return;
    inFlight.current = true;
    setError(null);
    const request = new AbortController();
    controller.current = request;
    try {
      const explanation = await explain.mutateAsync({ input, signal: request.signal });
      if (!request.signal.aborted) setReview({ input, reviewed: { explanation, explanationOrigin: "ai_dikonfirmasi" } });
    } catch (failure) {
      if (request.signal.aborted) return;
      if (isApiError(failure) && FALLBACK_CODES.has(failure.code)) {
        setReview({ input, reviewed: { explanation: null, explanationOrigin: "teks_pengisi" } });
      } else {
        setError(isApiError(failure, "VALIDATION_FAILED") ? SIMPAN_OBAT.galatValidasi : AUTH.galatUmum);
      }
    } finally {
      inFlight.current = false;
    }
  }

  function edit() {
    if (inFlight.current) return;
    setReview(null);
    setError(null);
  }

  async function confirm() {
    if (!review || inFlight.current || saved) return;
    inFlight.current = true;
    setError(null);
    try {
      const medicine = await onSave({ ...review.input, ...review.reviewed });
      setSaved(true);
      router.replace(mode === "edit"
        ? `${medicineDetail(medicine.id)}?updated=1`
        : `${ROUTES.medicines}?saved=${encodeURIComponent(medicine.id)}`);
    } catch (failure) {
      if (isApiError(failure, "NOT_FOUND")) {
        setMissing(true);
        return;
      }
      setError(isApiError(failure, "VALIDATION_FAILED") ? SIMPAN_OBAT.galatValidasi : SIMPAN_OBAT.galatSimpan);
    } finally {
      inFlight.current = false;
    }
  }

  if (missing) {
    return <>
      <PageHeader title={mode === "edit" ? UBAH_OBAT.judul : OBAT.tambahObat} backHref={ROUTES.medicines} />
      <ErrorState title={OBAT.tidakDitemukan} message={OBAT.tidakDitemukanPesan} action={<Button asChild variant="secondary"><Link href={ROUTES.medicines}>{OBAT.kembaliKeDaftar}</Link></Button>} />
    </>;
  }

  return (
    <>
      <div hidden={explain.isPending}>
        <PageHeader title={mode === "edit" ? UBAH_OBAT.judul : OBAT.tambahObat} backHref={backHref} />
      </div>
      <div ref={formRef} tabIndex={-1} role="group" aria-label={FORM_OBAT.dataObat} hidden={explain.isPending}>
        {error && !review ? <Notice tone="danger" role="alert">{error}</Notice> : null}
        <MedicineForm values={values} onValuesChange={setValues} onValid={(input) => void handleValid(input)} busy={explain.isPending || saving || saved} instructions={mode === "edit" ? UBAH_OBAT.petunjuk : undefined} />
      </div>
      {explain.isPending ? <PreparingExplanation /> : null}
      {review ? (
        <MedicineReviewDialog review={review} saving={saving || saved} error={error} onConfirm={() => void confirm()} onEdit={edit} returnFocusRef={formRef} title={mode === "edit" ? UBAH_OBAT.periksaJudul : undefined} />
      ) : null}
    </>
  );
}
