import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { DRAFT } from "../copy";
import { IconLink } from "./icon-button";

export type PageHeaderProps = {
  title: string;

  backHref?: string;

  action?: ReactNode;
};

export function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return (
    <header className="@container flex flex-wrap items-center justify-between gap-3">
      {backHref ? (
        <IconLink href={backHref} label={DRAFT.kembali} icon={<ArrowLeft />} />
      ) : (
        <span aria-hidden="true" className="size-touch shrink-0" />
      )}
      <h1 className="min-w-0 flex-1 text-center text-section @max-[16em]:order-3 @max-[16em]:basis-full">{title}</h1>
      {action ?? <span aria-hidden="true" className="size-touch shrink-0" />}
    </header>
  );
}
