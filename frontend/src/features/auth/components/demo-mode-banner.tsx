"use client";

import { FlaskConical } from "lucide-react";
import { AUTH } from "@/shared/copy";
import { useHousehold } from "../hooks/use-household";

/** Penanda tetap bahwa sesi ini Akun Demo Juri (P08 tugas 2). Tidak tampil untuk akun biasa. */
export function DemoModeBanner() {
  const household = useHousehold();
  if (!household.data?.isDemo) return null;
  return (
    <p role="status" className="flex items-center gap-2 bg-warning-soft px-gutter py-2 text-body font-semibold text-warning">
      <FlaskConical aria-hidden="true" className="size-5 shrink-0" />
      {AUTH.modeDemo}
    </p>
  );
}
