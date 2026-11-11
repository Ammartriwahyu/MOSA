import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { DRAFT } from "../copy";
import { cx } from "./cx";

/** Indikator memuat dengan label untuk pembaca layar (docs/06: jangan biarkan layar menggantung). */
export function Spinner({ label = DRAFT.memuat, visibleLabel = false }: { label?: string; visibleLabel?: boolean }) {
  return (
    <span role="status" className="inline-flex items-center gap-3 text-body text-ink-secondary">
      <LoaderCircle aria-hidden="true" className="size-7 shrink-0 animate-spin text-brand" />
      <span className={visibleLabel ? undefined : "sr-only"}>{label}</span>
    </span>
  );
}

/** Kerangka abu saat data dimuat. Dekoratif; pasangkan dengan Spinner untuk pembaca layar. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block animate-pulse rounded-field bg-line", className)} />;
}

type StateProps = {
  title: string;
  message?: string;
  icon?: ReactNode;
  /** Jalan keluar (docs/06: setiap kegagalan punya pesan dan jalan keluar). */
  action?: ReactNode;
};

/** Keadaan kosong (mis. Figma 04 dasbor akun baru). */
export function EmptyState({ title, message, icon, action }: StateProps) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-card">
      {icon ? (
        <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-pill bg-brand-soft text-brand">
          {icon}
        </span>
      ) : null}
      <h2 className="text-section">{title}</h2>
      {message ? <p className="text-body text-ink-secondary">{message}</p> : null}
      {action ? <div className="w-full pt-1">{action}</div> : null}
    </section>
  );
}

/** Keadaan gagal; diumumkan langsung ke pembaca layar. */
export function ErrorState({ title, message, icon, action }: StateProps) {
  return (
    <section role="alert" className="flex flex-col items-center gap-3 rounded-card border-3 border-danger-border bg-danger-soft p-6 text-center">
      <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-pill bg-danger-icon-soft text-danger">
        {icon ?? <CircleAlert className="size-10" />}
      </span>
      <h2 className="text-section text-danger-strong">{title}</h2>
      {message ? <p className="text-body text-ink">{message}</p> : null}
      {action ? <div className="w-full pt-1">{action}</div> : null}
    </section>
  );
}
