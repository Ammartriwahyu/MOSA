"use client";

import { useRouter } from "next/navigation";
import { useRef, type RefObject } from "react";
import { useSessionIdentity } from "@/features/auth";
import { ROUTES } from "@/shared/config";
import { SCAN_CAPTURE } from "@/shared/copy";
import { Button, ErrorState, Spinner } from "@/shared/ui";
import { usePhotoCapture } from "../hooks/use-photo-capture";
import { useScanConsent } from "../hooks/use-scan-consent";
import { parseScanTarget, type ScanTarget } from "../lib/scan-target";
import { ScanCaptureView } from "./scan-capture-view";
import { ScanConsentDialog } from "./scan-consent-dialog";

function ReadyCapture({ target, headingRef }: { target: Exclude<ScanTarget, { mode: "invalid" }>; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const capture = usePhotoCapture();
  return <ScanCaptureView capture={capture} target={target} headingRef={headingRef} />;
}

/** Key akun/target membuang Blob dan URL saat konteks scan berganti. */
export function ScanCaptureFlow({ userId, target }: { userId: string; target: Exclude<ScanTarget, { mode: "invalid" }> }) {
  const consent = useScanConsent(userId);
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyCapture = usePhotoCapture();
  if (consent.household.isPending) return <Spinner label={SCAN_CAPTURE.checkingConsent} visibleLabel />;
  if (consent.household.isError) return <ErrorState title={SCAN_CAPTURE.loadFailed} action={<Button variant="secondary" onClick={() => void consent.household.refetch()}>{SCAN_CAPTURE.retry}</Button>} />;
  if (consent.ready) return <ReadyCapture target={target} headingRef={headingRef} />;
  return <>
    <ScanCaptureView capture={emptyCapture} target={target} headingRef={headingRef} enabled={false} />
    <ScanConsentDialog open pending={consent.accepting} error={consent.error} onAgree={() => void consent.accept()}
      onCancel={() => router.push(ROUTES.home)} returnFocusRef={headingRef} />
  </>;
}

export function ScanScreen({ doseTarget }: { doseTarget?: string | string[] }) {
  const userId = useSessionIdentity();
  const router = useRouter();
  const target = parseScanTarget(doseTarget);
  if (target.mode === "invalid") return <ErrorState title={SCAN_CAPTURE.invalidTarget} action={<Button variant="secondary" onClick={() => router.push(ROUTES.home)}>{SCAN_CAPTURE.close}</Button>} />;
  if (!userId) return <Spinner visibleLabel />;
  return <ScanCaptureFlow key={`${userId}:${target.mode === "selected" ? target.slotId : "generic"}`} userId={userId} target={target} />;
}
