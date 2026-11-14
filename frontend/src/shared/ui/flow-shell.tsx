"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES } from "../config";
import { cx } from "./cx";
import { SideNav } from "./side-nav";
import { MAIN_CONTENT_ID, SkipLink } from "./skip-link";

const FULL_SCREEN = [ROUTES.scan, ROUTES.outputPreference];

export function FlowShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const withNav = !FULL_SCREEN.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return (
    <div className="flex min-h-dvh w-full">
      {withNav ? <><SkipLink /><SideNav /></> : null}
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className={cx(
          "@container mx-auto flex min-h-dvh outline-none w-full min-w-0 max-w-app flex-col gap-4 px-gutter pt-6 pb-10 [overflow-wrap:anywhere] md:max-w-2xl",
          withNav ? "lg:max-w-6xl lg:px-10 lg:pt-8" : "md:max-w-xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
