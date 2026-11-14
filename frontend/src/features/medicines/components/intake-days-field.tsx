"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { DRAFT, NAMA_HARI, SEMUA_HARI } from "@/shared/copy";
import { CheckboxCard, cx } from "@/shared/ui";

/** Hari minum: "Setiap hari" (bawaan) atau hari tertentu. Dipisah dari jam agar tetap satu ketukan per pilihan. */
export function IntakeDaysField({ days, onChange, error }: {
  days: number[];
  onChange: (days: number[]) => void;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-galat`;
  const everyDay = SEMUA_HARI.every((day) => days.includes(day));

  const toggle = (day: number, checked: boolean) =>
    onChange(checked ? [...days, day].sort((a, b) => a - b) : days.filter((value) => value !== day));

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="pb-1 text-card-title">{DRAFT.hariMinum}</legend>
      <CheckboxCard
        label={DRAFT.setiapHari}
        description={everyDay ? DRAFT.hariMinumPetunjuk : undefined}
        checked={everyDay}
        // Mematikan "Setiap hari" mengosongkan pilihan agar pengguna memilih hari secara sadar.
        onChange={(event) => onChange(event.target.checked ? [...SEMUA_HARI] : [])}
      />
      {everyDay ? null : (
        // Kolom mengikuti lebar kolom form ini (bukan layar) agar nama hari tidak terpotong.
        <div className="@container"><div className="grid grid-cols-1 gap-2 @[15rem]:grid-cols-2 @[24rem]:grid-cols-3 @[32rem]:grid-cols-4" data-invalid={error ? true : undefined}>
          {SEMUA_HARI.map((day) => {
            const checked = days.includes(day);
            const name = NAMA_HARI[day - 1];
            return (
              <label key={day} className={cx(
                "flex min-h-touch cursor-pointer items-center gap-2 rounded-note bg-surface px-3 py-2 text-button font-semibold",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                checked ? "border-3 border-brand bg-brand-soft text-brand-ink" : error ? "border-3 border-danger" : "border-2 border-field-border",
              )}>
                <input type="checkbox" className="sr-only" checked={checked} aria-invalid={error ? true : undefined}
                  onChange={(event) => toggle(day, event.target.checked)} />
                <span aria-hidden="true" className={cx("flex size-6 shrink-0 items-center justify-center rounded-md",
                  checked ? "bg-brand text-on-brand" : "border-3 border-ink-secondary bg-surface")}>
                  {checked ? <Check className="size-4" /> : null}
                </span>
                <span className="min-w-0 [overflow-wrap:normal]">{name}</span>
              </label>
            );
          })}
        </div></div>
      )}
      {error ? (
        <p id={errorId} role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
