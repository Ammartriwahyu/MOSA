"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";

export type ChoiceOption<Value extends string> = {
  value: Value;
  title: string;
  description?: string;
  icon?: ReactNode;
};

export type ChoiceCardsProps<Value extends string> = {
  legend: string;
  name: string;
  options: ReadonlyArray<ChoiceOption<Value>>;
  value: Value | null;
  onChange: (value: Value) => void;
};

/**
 * Grup pilihan berbentuk kartu (Figma 09, 22, B16: "Teks saja" / "Teks + Suara").
 * Memakai radio bawaan agar panah keyboard dan pembaca layar bekerja tanpa skrip.
 */
export function ChoiceCards<Value extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: ChoiceCardsProps<Value>) {
  const groupId = useId();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-card-title">{legend}</legend>
      {options.map((option) => {
        const checked = option.value === value;
        const titleId = `${groupId}-${option.value}-judul`;
        const descriptionId = option.description ? `${groupId}-${option.value}-keterangan` : undefined;
        return (
          <label
            key={option.value}
            className={cx(
              "flex cursor-pointer items-center gap-4 rounded-card bg-surface p-4.5",
              "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
              checked ? "border-3 border-brand shadow-card" : "border-2 border-field-border",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              // Nama radio = judul saja; keterangan sebagai deskripsi (tidak dibaca dua kali).
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="sr-only"
            />
            {option.icon ? (
              <span
                aria-hidden="true"
                className={cx(
                  "flex size-14 shrink-0 items-center justify-center rounded-pill",
                  checked ? "bg-brand-soft text-brand" : "bg-canvas text-ink",
                )}
              >
                {option.icon}
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span id={titleId} className="text-title">
                {option.title}
              </span>
              {option.description ? (
                <span id={descriptionId} className="text-body text-ink-secondary">
                  {option.description}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className={cx(
                "flex size-7.5 shrink-0 items-center justify-center rounded-pill border-3",
                checked ? "border-brand" : "border-ink-secondary",
              )}
            >
              {checked ? <span className="size-4 rounded-pill bg-brand" /> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
