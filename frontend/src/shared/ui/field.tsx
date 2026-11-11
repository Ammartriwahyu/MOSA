"use client";

import { ChevronDown } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

type FieldFrameProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Ikon dekoratif di kiri isian (Figma A10: gembok). */
  icon?: ReactNode;
};

const CONTROL =
  "h-action-lg w-full min-w-0 bg-transparent text-body text-ink outline-none placeholder:text-muted";

function useFieldIds(hint?: string, error?: string) {
  const id = useId();
  const hintId = hint ? `${id}-petunjuk` : undefined;
  const errorId = error ? `${id}-galat` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return { id, hintId, errorId, describedBy };
}

function Frame({
  id,
  label,
  hint,
  hintId,
  error,
  errorId,
  icon,
  children,
}: FieldFrameProps & { id: string; hintId?: string; errorId?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
      </label>
      <div
        className={cx(
          "flex items-center gap-3 rounded-field border-2 bg-surface px-4.5 focus-within:border-brand",
          error ? "border-danger" : "border-field-border",
        )}
      >
        {icon ? (
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center text-ink-secondary">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
      {hint ? (
        <p id={hintId} className="text-body text-ink-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = FieldFrameProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/** Isian teks dengan label terlihat, petunjuk, dan galat yang terhubung (docs/06). */
export function TextField({ label, hint, error, icon, className, ...props }: TextFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <Frame {...{ id, label, hint, hintId, error, errorId, icon }}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL, className)}
        {...props}
      />
    </Frame>
  );
}

export type SelectFieldProps = FieldFrameProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
    options: ReadonlyArray<{ value: string; label: string }>;
  };

/** Pilihan bawaan browser (paling mudah diakses di HP), bergaya isian. */
export function SelectField({ label, hint, error, icon, options, className, ...props }: SelectFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <Frame {...{ id, label, hint, hintId, error, errorId, icon }}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL, "appearance-none", className)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="size-6 shrink-0 text-ink-secondary" />
    </Frame>
  );
}
