import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  /** Label aksesibel wajib (ikon tanpa label dilarang, docs/06). Ambil dari copy.ts. */
  label: string;
  icon: ReactNode;
};

/** Tombol ikon bulat 48 px berbayangan (Figma: Pengaturan, Kembali). */
export function IconButton({ label, icon, className, type, ...props }: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      aria-label={label}
      className={cx(
        "inline-flex size-touch shrink-0 items-center justify-center rounded-pill bg-surface text-ink shadow-card",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="flex size-6 items-center justify-center">
        {icon}
      </span>
    </button>
  );
}
