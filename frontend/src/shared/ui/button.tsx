"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

const VARIANT = {

  action: "bg-action text-on-action",

  brand: "bg-brand text-on-brand",

  secondary: "bg-secondary text-ink",

  danger: "bg-danger text-on-brand",

  outline: "border-2 border-action bg-surface text-ink",

  "danger-outline": "border-2 border-danger bg-surface text-danger",

  info: "border-2 border-info-border bg-info-soft text-info",
} as const;

const SIZE = {
  md: "min-h-action",
  lg: "min-h-action-lg",
} as const;

export type ButtonVariant = keyof typeof VARIANT;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;

  icon?: ReactNode;

  fullWidth?: boolean;

  asChild?: boolean;
};

export function Button({
  variant = "action",
  size = "md",
  icon,
  fullWidth = true,
  asChild = false,
  className,
  type,
  children,
  ...props
}: ButtonProps) {
  const classes = cx(
    "inline-flex min-w-0 items-center justify-center gap-2.5 rounded-pill px-5 py-3 text-center text-button [overflow-wrap:anywhere]",
    "transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-secondary disabled:text-muted",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button type={type ?? "button"} className={classes} {...props}>
      {icon ? (
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
