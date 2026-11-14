"use client";

import { Camera, House, Pill } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "../config";
import { DRAFT, TOMBOL } from "../copy";
import { cx } from "./cx";
import { isActivePath as isActive } from "./is-active-path";

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
          "flex min-w-0 flex-col items-center justify-center gap-1 rounded-tile py-2 text-body @max-[16em]:flex-row @max-[16em]:gap-3",
          active ? "bg-brand-soft font-bold text-brand-ink" : "font-semibold text-muted",
        )}
      >
        <item.Icon aria-hidden="true" className="size-7" />
        <span className="min-w-0 text-center [overflow-wrap:anywhere]">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={DRAFT.navigasiUtama}
      className="@container fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-surface lg:hidden"
    >
      <div className="mx-auto grid max-w-app grid-cols-3 md:max-w-2xl items-center gap-2 px-4.5 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] @max-[16em]:grid-cols-1">
        {tab(items[0])}
        <Link
          href={ROUTES.scan}
          aria-current={scanActive ? "page" : undefined}
          className="flex min-w-0 flex-col items-center justify-center gap-1 text-body font-bold text-ink @max-[16em]:flex-row @max-[16em]:gap-3"
        >
          <span
            aria-hidden="true"
            className="flex size-action-lg shrink-0 items-center justify-center rounded-pill bg-action text-on-action shadow-card"
          >
            <Camera className="size-7" />
          </span>
          <span className="min-w-0 text-center [overflow-wrap:anywhere]">{TOMBOL.scanObat}</span>
        </Link>
        {tab(items[1])}
      </div>
    </nav>
  );
}
