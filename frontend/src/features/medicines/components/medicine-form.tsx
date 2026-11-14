"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DRAFT, FORM_OBAT, LABEL, OBAT } from "@/shared/copy";
import { Button, CheckboxCard, Notice, TextField } from "@/shared/ui";
import { FAMILIAR_MEDICINES } from "../data/familiar-medicines";
import {
  FORM_LIMITS,
  validateMedicineForm,
  type FormErrors,
  type MedicineFormOutput,
  type MedicineFormValues,
} from "../schemas/medicine-form";
import { IntakeTimesField } from "./intake-times-field";
import { LabelSourceField } from "./label-source-field";

export type MedicineFormProps = {
  /** Isian awal; dipakai lagi saat "Perbaiki lagi" dan Ubah Obat agar isian tidak hilang. */
  values: MedicineFormValues;
  onValuesChange: (values: MedicineFormValues) => void;
  onValid: (output: MedicineFormOutput) => void;
  /** Saat menunggu proses lanjutan (mis. AI), tombol dinonaktifkan. */
  busy?: boolean;
  instructions?: string;
};

/**
 * Formulir 9 isian (docs/01 §2, Figma MOSA DRAFT 17 · 135:4216). Nama obat:
 * pilih dari 15 obat familiar atau ketik sendiri (datalist bawaan); daftar
 * hanya mengisi nama, kekuatan selalu diisi terpisah (PRD §19 #15).
 */
export function MedicineForm({ values, onValuesChange, onValid, busy = false, instructions = FORM_OBAT.catatanIsi }: MedicineFormProps) {
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [attempt, setAttempt] = useState(0);

  // Setelah gagal kirim, fokus ke isian salah pertama (docs/06: galat jelas dan terjangkau).
  useEffect(() => {
    if (attempt === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid] input')?.focus();
  }, [attempt]);

  const set = <K extends keyof MedicineFormValues>(key: K, value: MedicineFormValues[K]) => {
    onValuesChange({ ...values, [key]: value });
    // Galat kolom hilang begitu kolom itu diubah; dicek lagi saat kirim.
    const field = key === "noWarnings" ? "warnings" : key;
    if (field in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateMedicineForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      setAttempt((n) => n + 1);
      return;
    }
    setErrors({});
    onValid(result.value);
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Notice tone="brand">{instructions}</Notice>

      <LabelSourceField value={values.labelSource} onChange={(v) => set("labelSource", v)} error={errors.labelSource} />

      {/* ≥ 1024 px: dua kolom (Figma Desktop 17 · 184:1663). Urutan DOM = urutan baca:
          kolom kiri (data obat) lalu kolom kanan (jadwal, larangan, catatan). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
      <div className="flex min-w-0 flex-col gap-4">
      <h2 className="text-card-title">{FORM_OBAT.dataObat}</h2>
      <TextField
        label={FORM_OBAT.namaObat}
        hint={FORM_OBAT.namaPetunjuk}
        list={listId}
        autoComplete="off"
        maxLength={FORM_LIMITS.name}
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        error={errors.name}
      />
      <datalist id={listId}>
        {FAMILIAR_MEDICINES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <TextField
        label={FORM_OBAT.kekuatan}
        hint={FORM_OBAT.kekuatanPetunjuk}
        maxLength={FORM_LIMITS.strength}
        value={values.strength}
        onChange={(e) => set("strength", e.target.value)}
        error={errors.strength}
      />
      <TextField
        label={LABEL.kegunaanObat}
        maxLength={FORM_LIMITS.purpose}
        value={values.purpose}
        onChange={(e) => set("purpose", e.target.value)}
        error={errors.purpose}
      />
      <TextField
        label={OBAT.aturanPakai}
        hint={DRAFT.petunjukAturanPakai}
        maxLength={FORM_LIMITS.usageRule}
        value={values.usageRule}
        onChange={(e) => set("usageRule", e.target.value)}
        error={errors.usageRule}
      />
      <TextField
        label={OBAT.jumlahPerMinum}
        maxLength={FORM_LIMITS.doseAmount}
        value={values.doseAmount}
        onChange={(e) => set("doseAmount", e.target.value)}
        error={errors.doseAmount}
      />

      </div>
      <div className="flex min-w-0 flex-col gap-4">
      <IntakeTimesField
        rows={values.times}
        onChange={(rows) => set("times", rows)}
        error={errors.times}
        rowErrors={errors.timeRows}
      />

      <TextField
        label={OBAT.larangan}
        hint={FORM_OBAT.privasiPetunjuk}
        maxLength={FORM_LIMITS.warnings}
        disabled={values.noWarnings}
        value={values.noWarnings ? DRAFT.tidakAdaLarangan : values.warnings}
        onChange={(e) => set("warnings", e.target.value)}
        error={errors.warnings}
      />
      <CheckboxCard
        label={DRAFT.tidakAdaLarangan}
        checked={values.noWarnings}
        onChange={(e) => set("noWarnings", e.target.checked)}
      />
      <TextField
        label={FORM_OBAT.catatanOpsional}
        hint={FORM_OBAT.privasiPetunjuk}
        placeholder={FORM_OBAT.catatanContoh}
        maxLength={FORM_LIMITS.notes}
        value={values.notes}
        onChange={(e) => set("notes", e.target.value)}
        error={errors.notes}
      />

      </div>
      </div>

      <Notice tone="plain">{FORM_OBAT.kirimAi}</Notice>

      {hasErrors ? (
        <Notice tone="danger" role="alert">
          {FORM_OBAT.galatRingkas}
        </Notice>
      ) : null}
      <Button type="submit" size="lg" icon={<ArrowRight />} disabled={busy}>
        {FORM_OBAT.lanjut}
      </Button>
    </form>
  );
}
