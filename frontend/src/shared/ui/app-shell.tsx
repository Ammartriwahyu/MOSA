import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";

/**
 * Kerangka halaman aplikasi (setelah masuk), mobile-first:
 * - < 768 px: satu kolom (maks 430 px) + navigasi bawah tetap.
 * - 768–1023 px: kolom lebih lebar, navigasi bawah tetap.
 * - ≥ 1024 px: navigasi samping (Figma Desktop) + area konten lebar; navigasi bawah disembunyikan.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="@container flex min-h-dvh w-full">
      <SideNav />
      <div className="mx-auto flex w-full min-w-0 max-w-app flex-1 flex-col md:max-w-2xl lg:max-w-6xl">
        <main className="flex min-w-0 flex-1 flex-col gap-3 px-gutter pt-6 pb-36 [overflow-wrap:anywhere] @max-[16em]:pb-48 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

/**
 * Kerangka halaman tanpa navigasi (masuk, daftar, onboarding, persetujuan).
 * ≥ 768 px: satu kartu di tengah (Figma Desktop 02/03), lebar nyaman untuk formulir.
 */
export function PlainShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full min-w-0 max-w-app flex-col gap-4 px-gutter pt-6 pb-10 [overflow-wrap:anywhere] md:my-12 md:min-h-0 md:max-w-xl md:rounded-card md:bg-surface md:px-10 md:py-10 md:shadow-card">
      {children}
    </main>
  );
}
