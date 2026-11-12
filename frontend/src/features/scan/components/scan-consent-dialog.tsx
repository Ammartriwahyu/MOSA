"use client";

import { Camera, Check, ShieldCheck, X } from "lucide-react";
import type { RefObject } from "react";
import { PERSETUJUAN_SCAN, SCAN_CAPTURE, TOMBOL } from "@/shared/copy";
import { Button, Dialog, Notice } from "@/shared/ui";

export function ScanConsentDialog({ open, pending, error, onAgree, onCancel, returnFocusRef }: {
  open: boolean; pending: boolean; error: boolean; onAgree: () => void; onCancel: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return <Dialog open={open} onOpenChange={(next) => { if (!next && !pending) onCancel(); }}
    title={SCAN_CAPTURE.consentTitle} description={<span className="block rounded-tile border-2 border-info-border bg-info-soft p-4 text-left text-ink">{PERSETUJUAN_SCAN}</span>} returnFocusRef={returnFocusRef}
    dismissOnOutsideClick={false} closeDisabled={pending}
    reserveCloseSpace={false}
    icon={<ShieldCheck className="size-10" />} iconTone="info"
    actions={<>
      <Button size="lg" variant="brand" disabled={pending} icon={<Camera />} onClick={onAgree}>{pending ? SCAN_CAPTURE.savingConsent : SCAN_CAPTURE.agree}</Button>
      <Button size="lg" variant="secondary" disabled={pending} onClick={onCancel}>{TOMBOL.batal}</Button>
    </>}>
    <ul className="flex flex-col gap-3 text-body">
      <li className="flex items-start gap-3"><Check aria-hidden="true" className="size-8 shrink-0 rounded-pill bg-success-soft p-1 text-success" />{SCAN_CAPTURE.goodPackage}</li>
      <li className="flex items-start gap-3"><X aria-hidden="true" className="size-8 shrink-0 rounded-pill bg-danger-icon-soft p-1 text-danger" />{SCAN_CAPTURE.avoidLabel}</li>
    </ul>
    <p className="text-body text-ink-secondary">{SCAN_CAPTURE.deviceNote}</p>
    {error ? <Notice tone="danger" role="alert">{SCAN_CAPTURE.consentFailed}</Notice> : null}
  </Dialog>;
}
