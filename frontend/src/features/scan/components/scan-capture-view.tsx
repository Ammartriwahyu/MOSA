"use client";

import { Camera, Clock, Info, ImagePlus, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, type RefObject } from "react";
import { ROUTES } from "@/shared/config";
import { SCAN_CAPTURE, SCAN_REQUEST, TOMBOL, jadwalTargetScan } from "@/shared/copy";
import { Button, IconLink, Notice, cx } from "@/shared/ui";
import type { usePhotoCapture } from "../hooks/use-photo-capture";
import type { ScanTarget } from "../lib/scan-target";

export function ScanCaptureView({ capture, target, headingRef, enabled = true, onUsePhoto, notice }: {
  capture: ReturnType<typeof usePhotoCapture>; target: Exclude<ScanTarget, { mode: "invalid" }>;
  headingRef: RefObject<HTMLHeadingElement | null>; enabled?: boolean;
  onUsePhoto?: () => void; notice?: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const instructionId = useId();
  const { photo, processing, error } = capture;
  const errorText = error === "unsupported" ? SCAN_CAPTURE.unsupported : error === "too_large" ? SCAN_CAPTURE.tooLarge : error === "unreadable" ? SCAN_CAPTURE.unreadable : SCAN_CAPTURE.compressionFailed;
  function select(input: HTMLInputElement) {
    const file = input.files?.[0]; input.value = "";
    if (file && enabled) void capture.select(file);
  }
  return <div className={cx("-mx-gutter -mt-6 -mb-10 flex min-h-dvh flex-col gap-4 px-gutter pt-6 pb-10", photo ? "bg-canvas text-ink" : "bg-camera text-on-action")}>
    <header className="flex items-center gap-3">
      <IconLink href={ROUTES.home} label={SCAN_CAPTURE.close} icon={<X />} className={photo ? undefined : "bg-on-action/15! text-on-action shadow-none"} />
      <h1 ref={headingRef} tabIndex={-1} className="flex-1 text-center text-section outline-none">{TOMBOL.scanObat}</h1>
      <span aria-hidden="true" className="size-touch" />
    </header>
    {notice ? <Notice tone="plain" role="status">{notice}</Notice> : null}
    <div className={cx("flex items-start gap-2 rounded-note px-3 py-2 text-body", photo ? "bg-brand-soft text-brand-ink" : "bg-on-action/15")}>
      {target.mode === "selected" ? <Clock aria-hidden="true" className="mt-0.5 size-6 shrink-0" /> : <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0" />}
      <p>{target.mode === "selected" ? <>{SCAN_CAPTURE.selectedMode}<br />{jadwalTargetScan(target.date, target.time)}</> : SCAN_CAPTURE.genericMode}</p>
    </div>
    <div className={photo ? "rounded-tile bg-surface p-5" : undefined}>
    <div className={cx("relative flex w-full items-center justify-center overflow-hidden rounded-sheet bg-camera-surface", photo ? "aspect-[6/5] p-4" : "p-10")}>
      {photo ?
        // Foto lokal tidak melalui optimasi/proxy Next Image agar tidak terkirim ke server.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={SCAN_CAPTURE.preview} className="h-full w-full object-contain" />
        : processing ? <span role="status" className="inline-flex items-center gap-3 text-body text-on-action"><LoaderCircle aria-hidden="true" className="size-7 shrink-0 animate-spin text-success-border" />{SCAN_CAPTURE.processing}</span>
          : <div className="flex flex-col items-center gap-3 text-center text-on-action"><Camera aria-hidden="true" className="size-16" /><p className="text-body">{SCAN_CAPTURE.empty}</p></div>}
      <span aria-hidden="true" className="absolute top-4 left-4 size-11 border-t-4 border-l-4 border-success-border" />
      <span aria-hidden="true" className="absolute top-4 right-4 size-11 border-t-4 border-r-4 border-success-border" />
      <span aria-hidden="true" className="absolute bottom-4 left-4 size-11 border-b-4 border-l-4 border-success-border" />
      <span aria-hidden="true" className="absolute right-4 bottom-4 size-11 border-r-4 border-b-4 border-success-border" />
    </div>
    </div>
    <p id={instructionId} className="text-center text-body">{photo ? SCAN_CAPTURE.review : SCAN_CAPTURE.instruction}</p>
    {photo ? <p role="status" className="text-body text-success">{SCAN_CAPTURE.ready}</p> : null}
    {error ? <Notice tone="danger" role="alert">{errorText}</Notice> : null}
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden disabled={!enabled || processing} aria-label={SCAN_CAPTURE.camera} onChange={(event) => select(event.currentTarget)} />
    <input ref={upload} type="file" accept="image/*" hidden disabled={!enabled || processing} aria-label={SCAN_CAPTURE.upload} onChange={(event) => select(event.currentTarget)} />
    {photo && onUsePhoto ? <Button size="lg" variant="brand" disabled={!enabled || processing} onClick={onUsePhoto}>{SCAN_REQUEST.usePhoto}</Button> : null}
    {photo ? <Button size="lg" variant="secondary" disabled={!enabled || processing} icon={<Camera />} onClick={() => { capture.clear(); camera.current?.click(); }}>{SCAN_CAPTURE.retake}</Button>
      : <div className="flex flex-col items-center gap-2"><button type="button" aria-label={SCAN_CAPTURE.camera} aria-describedby={instructionId} disabled={!enabled || processing}
        onClick={() => camera.current?.click()} className="flex size-22 items-center justify-center rounded-pill border-4 border-on-action disabled:opacity-50">
        <span aria-hidden="true" className="size-17 rounded-pill bg-on-action" />
      </button><p className="text-body">{SCAN_CAPTURE.cameraHint}</p></div>}
    <Button size="lg" variant="secondary" disabled={!enabled || processing} icon={<ImagePlus />} onClick={() => upload.current?.click()}>{photo ? SCAN_CAPTURE.another : SCAN_CAPTURE.upload}</Button>
    <Button asChild size="lg" variant="secondary"><Link href={ROUTES.home}>{SCAN_CAPTURE.backToSchedule}</Link></Button>
  </div>;
}
