import type { Transition } from "motion/react";

export const DURATION = {
  fast: 0.15,
  base: 0.24,
  slow: 0.4,
} as const;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const TRANSITION = {
  fast: { duration: DURATION.fast, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  slow: { duration: DURATION.slow, ease: EASE_OUT },

  spring: { type: "spring", stiffness: 420, damping: 36, mass: 1 },
} as const satisfies Record<string, Transition>;

export const STAGGER = 0.04;

export const SLIDE_DISTANCE = 12;
