import type { ReactNode } from "react";

export type BannerProps = {

  title: string;

  eyebrow?: ReactNode;

  children?: ReactNode;

  actions?: ReactNode;
};

export function Banner({ title, eyebrow, children, actions }: BannerProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-card bg-linear-to-b from-brand-strong to-brand-light px-5 py-4 text-on-brand"
    >
      {eyebrow ? (
        <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-pill bg-brand-strong px-3 py-1.5 text-body font-semibold [overflow-wrap:anywhere]">
          {eyebrow}
        </span>
      ) : null}
      <p className="text-page">{title}</p>
      {children ? <div className="text-body">{children}</div> : null}
      {actions ? <div className="mt-1 flex flex-col gap-2">{actions}</div> : null}
    </section>
  );
}
