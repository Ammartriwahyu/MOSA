"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { TRANSITION } from "./tokens";

const loadFeatures = () => import("./features").then((module) => module.default);

/**
 * Pembungkus gerak seluruh aplikasi. reducedMotion="user" mengikuti
 * prefers-reduced-motion (transform dimatikan, opacity tetap). LazyMotion
 * `strict` memastikan hanya komponen `m.*` ringan yang dipakai.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={TRANSITION.base}>
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
