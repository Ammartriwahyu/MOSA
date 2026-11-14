"use client";

import { Camera, House, Pill, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "../config";
import { DRAFT, NAMA_APLIKASI, TOMBOL } from "../copy";
import { cx } from "./cx";
import { isActivePath } from "./is-active-path";
import { Logo } from "./logo";

const ITEMS = [
  { href: ROUTES.home, label: DRAFT.navJadwal, Icon: House },
  { href: ROUTES.scan, label: TOMBOL.scanObat, Icon: Camera },
  { href: ROUTES.medicines, label: DRAFT.navObat, Icon: Pill },
  { href: ROUTES.settings, label: DRAFT.pengaturan, Icon: Settings },
] as const;

/**
 * Navigasi samping desktop (Figma Desktop 06 · 184:326): logo utama di atas,
 * menu berlabel teks (bukan ikon saja), target ≥ 56 px. Menggantikan navigasi
 * bawah mulai lebar 1024 px; tujuan dan urutan sama dengan navigasi mobile.
 */
export function SideNav() {
  const pathname = usePathname();
  return (
    // <header> tingkat atas = landmark banner: logo dan menu situs berada di dalam landmark.
    <header className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r-2 border-line bg-surface px-5 py-7 lg:flex">
      <Logo variant="utama" height={64} alt={NAMA_APLIKASI} />
      <nav aria-label={DRAFT.navigasiSamping}>
        <ul className="flex flex-col gap-2">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-h-action items-center gap-3.5 rounded-tile px-4 text-body transition-colors",
                    active ? "bg-brand-soft font-bold text-brand-ink" : "font-semibold text-ink-secondary hover:bg-canvas hover:text-ink",
                  )}
                >
                  <Icon aria-hidden="true" className="size-6.5 shrink-0" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
