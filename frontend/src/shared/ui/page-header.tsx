import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { DRAFT } from "../copy";
import { IconLink } from "./icon-button";

export type PageHeaderProps = {
  title: string;
  /** Tujuan tombol kembali; tanpa nilai = tidak ada tombol kembali. */
  backHref?: string;
  /** Aksi di kanan (mis. IconLink Pengaturan). */
  action?: ReactNode;
};

/** Header halaman (Figma MOSA DRAFT A3, A10): kembali · judul di tengah · aksi/spacer. */
export function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      {backHref ? (
        <IconLink href={backHref} label={DRAFT.kembali} icon={<ArrowLeft />} />
      ) : (
        <span aria-hidden="true" className="size-touch shrink-0" />
      )}
      <h1 className="flex-1 text-center text-section">{title}</h1>
      {action ?? <span aria-hidden="true" className="size-touch shrink-0" />}
    </header>
  );
}
