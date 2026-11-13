import type { Transition } from "motion/react";

// Satu sumber angka gerak (P17). Hanya transform dan opacity yang dianimasikan;
// durasi 150–400 ms, easing keluar, spring yang redam (tanpa memantul berulang).

/** Detik, bukan milidetik (satuan Motion). */
export const DURATION = {
  fast: 0.15,
  base: 0.24,
  slow: 0.4,
} as const;

/** Ease-out halus: mulai cepat, berhenti pelan. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const TRANSITION = {
  fast: { duration: DURATION.fast, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  slow: { duration: DURATION.slow, ease: EASE_OUT },
  /** Spring redam untuk umpan balik (mis. centang konfirmasi). */
  spring: { type: "spring", stiffness: 420, damping: 36, mass: 1 },
} as const satisfies Record<string, Transition>;

/** Jeda antaranak dalam daftar; kecil agar daftar panjang tidak terasa lambat. */
export const STAGGER = 0.04;

/** Jarak geser vertikal (px) untuk slide-up; kecil agar tidak mengganggu. */
export const SLIDE_DISTANCE = 12;
