"use client";

import * as m from "motion/react-m";
import { useEffect, useState, type ReactNode } from "react";
import { rise, stagger } from "./variants";

let hasNavigated = false;

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
