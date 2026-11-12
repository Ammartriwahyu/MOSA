"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { householdQueryKey, signOut, useSessionIdentity } from "@/features/auth";
import { ROUTES } from "@/shared/config";
import { SCAN_CAPTURE, SCAN_REQUEST } from "@/shared/copy";
import { Button, ErrorState, Spinner } from "@/shared/ui";
import { usePhotoCapture } from "../hooks/use-photo-capture";
import { scanConsentQueryKey, useScanConsent } from "../hooks/use-scan-consent";
import { useScanRequest, type ScanRequestFailure } from "../hooks/use-scan-request";
import { parseScanTarget, type ScanTarget } from "../lib/scan-target";
import { ScanCaptureView } from "./scan-capture-view";
import { ScanConsentDialog } from "./scan-consent-dialog";
import { ScanRequestView } from "./scan-request-view";
import { ScanOutcomeView } from "./scan-outcome-view";

function ReadyCapture({ target, headingRef, userId }: { target: Exclude<ScanTarget, { mode: "invalid" }>; headingRef: RefObject<HTMLHeadingElement | null>; userId: string }) {
  const capture = usePhotoCapture();
  const client = useQueryClient();
  const onFailure = useCallback((reason: ScanRequestFailure) => {
    if (reason === "session") void signOut();
    if (reason === "consent") {
      void client.invalidateQueries({ queryKey: householdQueryKey });
      void client.invalidateQueries({ queryKey: scanConsentQueryKey(userId) });
    }
  }, [client, userId]);
  const request = useScanRequest(onFailure);
  useEffect(() => { if (request.state.phase === "ready") headingRef.current?.focus(); }, [request.state.phase, headingRef]);
  if (request.state.phase === "complete") return <ScanOutcomeView result={request.state.result} onAgain={request.reset} />;
  if (request.state.phase !== "ready") return <ScanRequestView state={request.state} onCancel={request.cancel} onAgain={request.reset} />;
  return <ScanCaptureView capture={{ ...capture, select: async (file) => { request.reset(); await capture.select(file); } }}
    target={target} headingRef={headingRef} notice={request.state.cancelled ? SCAN_REQUEST.cancelled : undefined}
    onUsePhoto={capture.photo ? () => {
      const photo = capture.photo;
      if (!photo) return;
      void request.start({ blob: photo.blob, ...(target.mode === "selected" ? { slotId: target.slotId } : {}) });
      capture.clear();
    } : undefined} />;
}

/** Key akun/target membuang Blob dan URL saat konteks scan berganti. */
export function ScanCaptureFlow({ userId, target }: { userId: string; target: Exclude<ScanTarget, { mode: "invalid" }> }) {
  const consent = useScanConsent(userId);
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyCapture = usePhotoCapture();
  if (consent.household.isPending) return <Spinner label={SCAN_CAPTURE.checkingConsent} visibleLabel />;
  if (consent.household.isError) return <ErrorState title={SCAN_CAPTURE.loadFailed} action={<Button variant="secondary" onClick={() => void consent.household.refetch()}>{SCAN_CAPTURE.retry}</Button>} />;
  if (consent.ready) return <ReadyCapture target={target} headingRef={headingRef} userId={userId} />;
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
