import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

const ROUND =
  "inline-flex size-touch shrink-0 items-center justify-center rounded-pill bg-surface text-ink shadow-card";

export function IconLink({ href, label, icon, className }: { href: string; label: string; icon: ReactNode; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cx(ROUND, className)}>
      <span aria-hidden="true" className="flex size-6 items-center justify-center">
        {icon}
      </span>
    </Link>
  );
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {

  label: string;
  icon: ReactNode;
};

export function IconButton({ label, icon, className, type, ...props }: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      aria-label={label}
      className={cx(ROUND, className)}
      {...props}
    >
      <span aria-hidden="true" className="flex size-6 items-center justify-center">
        {icon}
      </span>
    </button>
  );
}
