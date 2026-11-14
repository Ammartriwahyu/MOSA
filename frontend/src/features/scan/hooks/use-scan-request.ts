"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/shared/lib";
import { scanPackage } from "../api/scan";
import type { ScanResponse } from "../schemas/scan-response";

export const SCAN_REQUEST_TIMEOUT_MS = 25_000;
export type ScanRequestFailure = "unavailable" | "consent" | "session" | "target" | "invalid";
export type ScanRequestState = { phase: "ready"; cancelled: boolean } | { phase: "pending" }
  | { phase: "error"; reason: ScanRequestFailure } | { phase: "complete"; result: ScanResponse };
type Job = { controller: AbortController; timeout: number };

function failureReason(error: unknown): ScanRequestFailure {
  if (isApiError(error, "CONSENT_REQUIRED")) return "consent";
  if (isApiError(error, "UNAUTHENTICATED")) return "session";
  if (isApiError(error, "NOT_FOUND")) return "target";
  if (isApiError(error, "VALIDATION_FAILED")) return "invalid";
  return "unavailable";
}

export function useScanRequest(onFailure?: (reason: ScanRequestFailure) => void) {
  const [state, setState] = useState<ScanRequestState>({ phase: "ready", cancelled: false });
  const current = useRef<Job | null>(null);
  const mounted = useRef(false);
  const dispose = useCallback(() => {
    const job = current.current; current.current = null;
    if (job) { window.clearTimeout(job.timeout); job.controller.abort(); }
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; dispose(); }; }, [dispose]);
  const reset = useCallback(() => { dispose(); setState({ phase: "ready", cancelled: false }); }, [dispose]);
  const cancel = useCallback(() => { dispose(); setState({ phase: "ready", cancelled: true }); }, [dispose]);

  async function start(input: { blob: Blob; slotId?: string }) {
    if (current.current || !mounted.current) return;
    const job: Job = { controller: new AbortController(), timeout: 0 };
    current.current = job;
    setState({ phase: "pending" });
    job.timeout = window.setTimeout(() => {
      if (current.current !== job) return;
      dispose();
      if (mounted.current) setState({ phase: "error", reason: "unavailable" });
    }, SCAN_REQUEST_TIMEOUT_MS);
    try {
      const result = await scanPackage({ ...input, signal: job.controller.signal });
      if (current.current === job && !job.controller.signal.aborted && mounted.current) setState({ phase: "complete", result });
    } catch (error) {
      if (current.current === job && mounted.current) {
        const reason = failureReason(error);
        setState({ phase: "error", reason });
        onFailure?.(reason);
      }
    } finally {
      window.clearTimeout(job.timeout);
      if (current.current === job) current.current = null;
    }
  }
  return { state, start, cancel, reset };
}
