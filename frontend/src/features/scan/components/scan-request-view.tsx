"use client";

import { Camera, FileSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ROUTES } from "@/shared/config";
import { AI_GAGAL, SCAN_CAPTURE, SCAN_REQUEST, TOMBOL } from "@/shared/copy";
import { Button, ErrorState } from "@/shared/ui";
import type { ScanRequestState } from "../hooks/use-scan-request";

export function ScanRequestView({ state, onCancel, onAgain }: {
  state: Exclude<ScanRequestState, { phase: "ready" }>; onCancel: () => void; onAgain: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [state.phase]);
  if (state.phase === "pending") return <section aria-busy="true" className="-mx-gutter -mt-6 -mb-10 flex min-h-dvh flex-col items-center justify-center gap-5 bg-camera px-gutter py-10 text-center text-on-action">
    <div aria-hidden="true" className="flex size-38 items-center justify-center rounded-pill border-8 border-success-border bg-on-action/5 text-success-border"><Camera className="size-15" /></div>
    <h1 ref={title} tabIndex={-1} className="text-display outline-none">{SCAN_REQUEST.reading}</h1>
    <p role="status" className="text-body">{SCAN_REQUEST.waiting}</p>
    <div aria-hidden="true" className="flex gap-2.5 text-success-border">
      <span className="size-3.5 rounded-pill bg-current motion-safe:animate-pulse" />
      <span className="size-3.5 rounded-pill bg-current opacity-60 motion-safe:animate-pulse" />
      <span className="size-3.5 rounded-pill bg-current opacity-30 motion-safe:animate-pulse" />
    </div>
    <Button size="lg" variant="secondary" onClick={onCancel}>{TOMBOL.batal}</Button>
    <p className="text-body">{SCAN_REQUEST.cancelHint}</p>
  </section>;

  if (state.phase === "error") {
    const message = state.reason === "consent" ? SCAN_REQUEST.consent : state.reason === "session" ? SCAN_REQUEST.session
      : state.reason === "target" ? SCAN_REQUEST.target : state.reason === "invalid" ? SCAN_REQUEST.invalid : AI_GAGAL;
    return <>
      <h1 ref={title} tabIndex={-1} className="text-section outline-none">{TOMBOL.scanObat}</h1>
      <ErrorState title={SCAN_REQUEST.failedTitle} message={message} action={<div className="flex flex-col gap-3">
        {state.reason !== "target" && state.reason !== "session" ? <Button size="lg" onClick={onAgain}>{SCAN_REQUEST.again}</Button> : null}
        <Button asChild size="lg" variant="secondary"><Link href={ROUTES.home}>{SCAN_CAPTURE.backToSchedule}</Link></Button>
      </div>} />
    </>;
  }
  // Tampilan khusus delapan hasil dipasang row38; hasil/token tetap di memori hook.
  return <section className="flex flex-col items-center gap-4 rounded-card bg-surface p-5 text-center">
    <FileSearch aria-hidden="true" className="size-16 text-muted" />
    <h1 ref={title} tabIndex={-1} className="text-display outline-none">{SCAN_REQUEST.completeTitle}</h1>
    <p role="status" className="text-body">{SCAN_REQUEST.completeMessage}</p>
    <Button size="lg" onClick={onAgain}>{SCAN_REQUEST.again}</Button>
    <Button asChild size="lg" variant="secondary"><Link href={ROUTES.home}>{SCAN_CAPTURE.backToSchedule}</Link></Button>
  </section>;
}
