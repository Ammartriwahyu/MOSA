import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

/**
 * Kerangka halaman aplikasi (setelah masuk): satu kolom mobile (maks 430 px, juga
 * di desktop karena Figma DRAFT hanya punya versi mobile) + navigasi bawah tetap.
 * Ruang bawah konten menyisakan tempat untuk navigasi.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <main className="flex flex-1 flex-col gap-3 px-gutter pt-6 pb-36">{children}</main>
      <BottomNav />
    </div>
  );
}

/** Kerangka halaman tanpa navigasi (masuk, daftar, onboarding). */
export function PlainShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col gap-4 px-gutter pt-6 pb-10">
      {children}
    </main>
  );
}
