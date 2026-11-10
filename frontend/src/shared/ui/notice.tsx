import { CircleAlert, Info, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

const TONE = {
  danger: { box: "border-2 border-danger-border-soft bg-danger-soft text-danger-strong", Icon: CircleAlert },
  neutral: { box: "bg-canvas text-ink-secondary", Icon: ShieldCheck },
  info: { box: "border-2 border-info-border bg-info-soft text-info", Icon: Info },
} as const;

/** Kotak catatan berikon (Figma A3 "Catatan", A10 catatan akun demo). */
export function Notice({ tone = "neutral", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  const { box, Icon } = TONE[tone];
  return (
    <div className={cx("flex items-start gap-3 rounded-note p-4 text-body", box)}>
      <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
