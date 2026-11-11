import type { ReactNode } from "react";
import { cx } from "./cx";

const BADGE_TONE = {
  /** Jatuh tempo ("Waktunya minum"). */
  due: "border-warning-border bg-warning-soft text-warning",
  /** Belum waktunya. */
  pending: "border-pending-border bg-pending-soft text-warning",
  /** Sudah diminum (✓ / ✓✓). */
  success: "border-success-border bg-success-soft text-success",
  /** Terlewat / bahaya. */
  danger: "border-danger-border bg-danger-soft text-danger",
  neutral: "border-line bg-canvas text-ink-secondary",
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

/**
 * Lencana status bergaris. Status selalu warna + ikon + teks (docs/06), jadi
 * `icon` dan `children` wajib. Teks 18 px: status tidak memakai ukuran di bawah
 * minimum teks isi (screen-map S2; Figma 16 px).
 */
export function Badge({ tone, icon, children }: { tone: BadgeTone; icon: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-pill border-2 px-3 py-1.5 text-body font-semibold",
        BADGE_TONE[tone],
      )}
    >
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      {children}
    </span>
  );
}

const CHIP_TONE = {
  neutral: "bg-canvas text-ink",
  brand: "bg-brand-soft text-brand-ink",
} as const;

/** Chip tanpa garis (hitungan dosis, label sumber). Teks 18 px (Figma 14 px, screen-map S2). */
export function Chip({ tone = "neutral", children }: { tone?: keyof typeof CHIP_TONE; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill px-2.5 py-1.5 text-body font-semibold",
        CHIP_TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
