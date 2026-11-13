import type { Variants } from "motion/react";
import { SLIDE_DISTANCE, STAGGER, TRANSITION } from "./tokens";

// Varian bernama "hidden" → "visible". Di bawah prefers-reduced-motion,
// MotionConfig reducedMotion="user" mematikan transform sehingga tersisa fade.

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION.base },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: SLIDE_DISTANCE },
  visible: { opacity: 1, y: 0, transition: TRANSITION.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: TRANSITION.base },
};

/**
 * Untuk konten penting (isi halaman, daftar): mulai dari keadaan yang tetap
 * terbaca (opacity 0,4), sehingga informasi tidak pernah tersembunyi meski
 * animasi belum atau tidak berjalan (fitur gerak dimuat terpisah).
 */
export const rise: Variants = {
  hidden: { opacity: 0.4, y: SLIDE_DISTANCE },
  visible: { opacity: 1, y: 0, transition: TRANSITION.base },
};

/** Induk daftar: anak muncul berurutan singkat. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER } },
};
