"use client";

import { Check } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";
import { cx } from "./cx";

export type CheckboxCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  label: string;
  description?: string;
  error?: string;
};

/**
 * Kotak centang berbentuk kartu (Figma 03: persetujuan data). Checkbox bawaan
 * (tersembunyi visual) agar Spasi, pembaca layar, dan validasi bekerja normal.
 */
export function CheckboxCard({ label, description, error, checked, className, ...props }: CheckboxCardProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-keterangan` : undefined;
  const errorId = error ? `${id}-galat` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={cx(
          "flex cursor-pointer items-center gap-3.5 rounded-note bg-surface px-4 py-3",
          "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
          error ? "border-3 border-danger" : checked ? "border-3 border-brand" : "border-2 border-field-border",
          className,
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          // Nama = kalimat utama saja; keterangan sebagai deskripsi (tidak dibaca dua kali).
          aria-labelledby={labelId}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          className="sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cx(
            "flex size-7.5 shrink-0 items-center justify-center rounded-lg",
            checked ? "bg-brand text-on-brand" : "border-3 border-ink-secondary bg-surface",
          )}
        >
          {checked ? <Check className="size-5" /> : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={labelId} className="text-button font-semibold">
            {label}
          </span>
          {description ? (
            <span id={descriptionId} className="text-body text-ink-secondary">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
