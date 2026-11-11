"use client";

import { Camera, House, Pill } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "../config";
import { DRAFT, TOMBOL } from "../copy";
import { cx } from "./cx";

function isActive(pathname: string, href: string): boolean {
  return href === ROUTES.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navigasi bawah (Figma MOSA DRAFT 05): Jadwal · Scan Obat (tombol tengah) · Obat.
 * Label teks selalu tampil di bawah ikon (docs/06: tanpa ikon tanpa label).
 */
export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: ROUTES.home, label: DRAFT.navJadwal, Icon: House },
    { href: ROUTES.medicines, label: DRAFT.navObat, Icon: Pill },
  ] as const;
  const scanActive = isActive(pathname, ROUTES.scan);

  const tab = (item: (typeof items)[number]) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex w-26 flex-col items-center gap-1 rounded-tile py-2 text-body",
          active ? "bg-brand-soft font-bold text-brand-ink" : "font-semibold text-muted",
        )}
      >
        <item.Icon aria-hidden="true" className="size-7" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label={DRAFT.navigasiUtama}
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-surface"
    >
      <div className="mx-auto flex max-w-app items-center justify-between px-4.5 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {tab(items[0])}
        <Link
          href={ROUTES.scan}
          aria-current={scanActive ? "page" : undefined}
          className="flex w-28 flex-col items-center gap-1 text-body font-bold text-ink"
        >
          <span
            aria-hidden="true"
            className="flex size-15 items-center justify-center rounded-pill bg-action text-on-action shadow-card"
          >
            <Camera className="size-7" />
          </span>
          {TOMBOL.scanObat}
        </Link>
        {tab(items[1])}
      </div>
    </nav>
  );
}
