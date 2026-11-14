import { CircleAlert, Info, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

const TONE = {
  danger: { box: "border-2 border-danger-border-soft bg-danger-soft text-danger-strong", Icon: CircleAlert },
  neutral: { box: "bg-canvas text-ink-secondary", Icon: ShieldCheck },

  brand: { box: "bg-brand-soft text-brand-ink", Icon: ShieldCheck },
  info: { box: "border-2 border-info-border bg-info-soft text-info", Icon: Info },

  plain: { box: "border-2 border-line bg-surface text-ink-secondary", Icon: Info },
} as const;

export function Notice({
  tone = "neutral",
  role,
  icon,
  children,
}: {
  tone?: keyof typeof TONE;

  role?: "alert" | "status";
  icon?: ReactNode;
  children: ReactNode;
}) {
  const { box, Icon } = TONE[tone];
  return (
    <div role={role} className={cx("flex items-start gap-3 rounded-note p-4 text-body", box)}>
      {icon ? <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center">{icon}</span> : <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
