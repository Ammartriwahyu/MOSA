import type { Variants } from "motion/react";
import { SLIDE_DISTANCE, STAGGER, TRANSITION } from "./tokens";

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

export const rise: Variants = {
  hidden: { opacity: 0.4, y: SLIDE_DISTANCE },
  visible: { opacity: 1, y: 0, transition: TRANSITION.base },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER } },
};
