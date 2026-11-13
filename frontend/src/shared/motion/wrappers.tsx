"use client";

import { m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { rise, stagger } from "./variants";

// Muat pertama tidak dianimasikan: HTML dari server langsung terlihat (tanpa
// menunda LCP dan tanpa hydration mismatch). Navigasi berikutnya baru bergerak.
let hasNavigated = false;

/**
 * Transisi masuk halaman: slide-up singkat, tanpa animasi keluar agar navigasi
 * tidak tertahan. `className` meniru tata letak kolom kerangka (jarak antar-blok).
 */
export function PageTransition({ children, className }: { children: ReactNode; className: string }) {
  const [initial] = useState<"hidden" | false>(() => (hasNavigated ? "hidden" : false));
  useEffect(() => {
    hasNavigated = true;
  }, []);
  return (
    <m.div initial={initial} animate="visible" variants={rise} className={className}>
      {children}
    </m.div>
  );
}

/** Daftar yang anaknya muncul berurutan singkat. Anak memakai `StaggerItem`. */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.ul initial="hidden" animate="visible" variants={stagger} className={className}>
      {children}
    </m.ul>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.li variants={rise} className={className}>
      {children}
    </m.li>
  );
}
