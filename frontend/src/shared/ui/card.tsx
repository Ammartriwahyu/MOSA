import type { HTMLAttributes } from "react";
import { cx } from "./cx";

const TONE = {
  default: "bg-surface shadow-card",

  brand: "border-2 border-brand-border bg-brand-soft",

  due: "border-3 border-warning-border bg-surface shadow-card",

  danger: "border-3 border-danger-border bg-danger-soft",

  plain: "border-2 border-field-border bg-surface",
} as const;

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: keyof typeof TONE;

  as?: "section" | "article" | "div" | "li";
};

export function Card({ tone = "default", as: Tag = "section", className, ...props }: CardProps) {
  return (
    <Tag
      className={cx("flex flex-col gap-3.5 rounded-card p-4.5", TONE[tone], className)}
      {...props}
    />
  );
}
