"use client";

import { useId } from "react";
import { FORM_OBAT, LABEL } from "@/shared/copy";
import { cx } from "@/shared/ui";
import type { LabelSource } from "../schemas/medicine-form";

const OPTIONS: ReadonlyArray<{ value: LabelSource; label: string }> = [
  { value: "apoteker", label: LABEL.diisiApoteker },
  { value: "keluarga", label: LABEL.diisiKeluarga },
];

/**
 * "Siapa yang mengisi?" (Figma 17: segmented; docs/01 isian #9). Radio bawaan
 * agar panah keyboard dan pembaca layar bekerja. Tanpa pilihan bawaan: pengisi
 * wajib memilih sendiri (D9).
 */
export function LabelSourceField({
  value,
  onChange,
  error,
}: {
  value: LabelSource | null;
  onChange: (value: LabelSource) => void;
  error?: string;
}) {
  const id = useId();
  const hintId = `${id}-petunjuk`;
  const errorId = `${id}-galat`;
  return (
    <fieldset
      className="flex min-w-0 flex-col gap-2"
      // Penanda untuk fokus otomatis ke galat pertama (radio tidak mendukung aria-invalid).
      data-invalid={error ? true : undefined}
      aria-describedby={error ? `${hintId} ${errorId}` : hintId}
    >
      <legend className="pb-2 text-card-title">{FORM_OBAT.siapaMengisi}</legend>
      <div
        className={cx(
          "flex flex-wrap gap-1.5 rounded-pill border-2 bg-surface p-1.5",
          error ? "border-danger" : "border-field-border",
        )}
      >
        {OPTIONS.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cx(
                "flex min-h-13 min-w-0 flex-1 basis-32 cursor-pointer items-center justify-center rounded-pill px-2 py-2 text-center text-body font-bold",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                checked ? "bg-action text-on-action" : "text-ink-secondary",
              )}
            >
              <input
                type="radio"
                name={`${id}-sumber`}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      <p id={hintId} className="text-body text-ink-secondary">
        {FORM_OBAT.siapaMengisiPetunjuk}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
