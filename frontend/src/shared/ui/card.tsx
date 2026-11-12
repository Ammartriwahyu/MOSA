import type { HTMLAttributes } from "react";
import { cx } from "./cx";

const TONE = {
  default: "bg-surface shadow-card",
  /** Jadwal berikutnya (Figma 15): hijau muda bergaris, tanpa bayangan. */
  brand: "border-2 border-brand-border bg-brand-soft",
  /** Kartu dosis jatuh tempo (Figma 05: bingkai kuning). */
  due: "border-3 border-warning-border bg-surface shadow-card",
  /** Pesan peringatan (Figma A3: kotak merah muda bergaris merah). */
  danger: "border-3 border-danger-border bg-danger-soft",
  /** Pilihan tanpa bayangan (Figma A10: bingkai tipis). */
  plain: "border-2 border-field-border bg-surface",
} as const;

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: keyof typeof TONE;
  /** Elemen semantik; bawaan `section`. */
  as?: "section" | "article" | "div" | "li";
};

/** Kartu 24 px (Figma MOSA DRAFT: kartu obat, progres, pengaturan). */
export function Card({ tone = "default", as: Tag = "section", className, ...props }: CardProps) {
  return (
    <Tag
      className={cx("flex flex-col gap-3.5 rounded-card p-4.5", TONE[tone], className)}
      {...props}
    />
  );
}
