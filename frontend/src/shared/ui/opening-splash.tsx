"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { TRANSITION } from "../motion";
import { Logo } from "./logo";

export const OPENING_SPLASH_ATTRIBUTE = "data-pembuka";

const HOLD_MS = 1_400;
const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function markOpeningSplash(win: Window): void {
  try {
    if (!["/", "/welcome", "/login"].includes(win.location.pathname)) return;
    if (win.sessionStorage.getItem("mosa:pembuka")) return;
    win.sessionStorage.setItem("mosa:pembuka", "1");
    win.document.documentElement.setAttribute("data-pembuka", "");
  } catch {
    // Mode privat / storage diblokir: lewati pembuka.
  }
}

export const OPENING_SPLASH_SCRIPT = `(${markOpeningSplash.toString()})(window);`;

export function OpeningSplash() {
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {

    if (!document.documentElement.hasAttribute(OPENING_SPLASH_ATTRIBUTE)) return;
    const leave = () => setLeaving(true);

    const timer = window.setTimeout(leave, reduceMotion ? 0 : HOLD_MS);
    for (const event of SKIP_EVENTS) window.addEventListener(event, leave, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of SKIP_EVENTS) window.removeEventListener(event, leave);
    };
  }, [reduceMotion]);

  return (
    <m.div
      aria-hidden="true"
      className="pembuka fixed inset-0 z-50 items-center justify-center bg-canvas px-gutter"
      initial={false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={reduceMotion ? { duration: 0.2 } : TRANSITION.base}
      onAnimationComplete={() => {

        if (leaving) document.documentElement.removeAttribute(OPENING_SPLASH_ATTRIBUTE);
      }}
    >
      <m.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={TRANSITION.slow}
      >
        <Logo variant="utama" height={96} alt="" priority />
      </m.div>
    </m.div>
  );
}
