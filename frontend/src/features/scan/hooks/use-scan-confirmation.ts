"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { confirmVerifiedDose, getTodaysDoses, dosesQueryKey, type DoseConfirmation } from "@/features/doses";
import { isApiError } from "@/shared/lib";
import type { ScanResponse } from "../schemas/scan-response";

export type ConfirmableScan = Extract<ScanResponse, { outcome: "bisa_konfirmasi" }>;
export type ScanSlot = ConfirmableScan["slots"][number];
type Failure = "expired" | "changed" | "already" | "uncertain";
type State = { phase: "ready" } | { phase: "pending" } | { phase: "error"; reason: Failure } | { phase: "saved"; receipt: DoseConfirmation };

export function useScanConfirmation(result: ScanResponse) {
  const client = useQueryClient();
  const [state, setState] = useState<State>({ phase: "ready" });
  const [selected, setSelected] = useState<ScanSlot | null>(null);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const [receivedAt] = useState(() => performance.now());
  const current = useRef<{ controller: AbortController; timeout: number } | null>(null);
  const active = useRef(false);
  const consumed = useRef(false);
  const verified = useRef(false);
  const reviewJob = useRef<AbortController | null>(null);
  const reviewTimeout = useRef<number | undefined>(undefined);
  const trigger = useRef<HTMLElement | null>(null);
  const lifetime = result.outcome === "bisa_konfirmasi" ? Math.max(0, Math.min(...result.slots.map((slot) => Date.parse(slot.expiresAt) - Date.parse(result.serverTime)))) : Infinity;
  const isExpired = () => performance.now() - receivedAt >= lifetime;
  useEffect(() => {
    active.current = true;
    const check = () => { if (performance.now() - receivedAt >= lifetime) setExpired(true); };
    const timer = Number.isFinite(lifetime) ? window.setTimeout(check, Math.min(lifetime, 2_147_483_647)) : undefined;
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => {
      active.current = false; window.clearTimeout(timer);
      reviewJob.current?.abort(); reviewJob.current = null;
      window.clearTimeout(reviewTimeout.current);
      window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check);
      const job = current.current; current.current = null;
      if (job) { window.clearTimeout(job.timeout); job.controller.abort(); }
    };
  }, [lifetime, receivedAt]);

  async function open(slot: ScanSlot, button: HTMLButtonElement) {
    if (current.current || reviewJob.current || consumed.current || state.phase !== "ready" || result.outcome !== "bisa_konfirmasi") return;
    if (isExpired()) { setExpired(true); return; }
    const ownSlot = result.slots.find((row) => row.slotId === slot.slotId);
    if (!ownSlot) return;
    trigger.current = button; setSelected(ownSlot); verified.current = false; setChecking(true);
    const controller = new AbortController(); reviewJob.current = controller;
    reviewTimeout.current = window.setTimeout(() => {
      if (reviewJob.current !== controller) return;
      reviewJob.current = null; controller.abort();
      if (active.current) { setChecking(false); setState({ phase: "error", reason: "uncertain" }); }
    }, 25_000);
    try {
      const fresh = await getTodaysDoses(controller.signal);
      if (!active.current || reviewJob.current !== controller) return;
      const dose = [...fresh.doses, ...fresh.carryoverDoses, ...fresh.earlyDoses].find((row) => row.slotId === ownSlot.slotId);
      if (dose?.status === "sudah") { setState({ phase: "error", reason: "already" }); return; }
      const same = dose?.medicineId === result.medicine.id && dose.scheduledDate === ownSlot.scheduledDate && dose.scheduledTime === ownSlot.scheduledTime
        && dose.medicine.name === result.medicine.name && dose.medicine.strength === result.medicine.strength
        && dose.medicine.doseAmount === result.medicine.doseAmount && dose.medicine.usageRule === result.medicine.usageRule;
      if (!same || dose?.status !== "jatuh_tempo") { setState({ phase: "error", reason: "changed" }); return; }
      if (isExpired()) { setExpired(true); return; }
      verified.current = true;
    } catch {
      if (active.current && reviewJob.current === controller) setState({ phase: "error", reason: "uncertain" });
    } finally {
      if (reviewJob.current === controller) { window.clearTimeout(reviewTimeout.current); reviewJob.current = null; if (active.current) setChecking(false); }
    }
  }
  function close() { if (!current.current) { reviewJob.current?.abort(); reviewJob.current = null; window.clearTimeout(reviewTimeout.current); setSelected(null); } }
  async function refresh() {
    await client.cancelQueries({ queryKey: dosesQueryKey });
    await client.invalidateQueries({ queryKey: dosesQueryKey });
  }
  async function submit() {
    if (!selected || current.current || consumed.current || !verified.current || state.phase !== "ready" || !active.current) return;
    if (isExpired()) { setExpired(true); return; }
    const slot = selected;
    consumed.current = true;
    const job = { controller: new AbortController(), timeout: 0 }; current.current = job;
    setState({ phase: "pending" });
    job.timeout = window.setTimeout(() => {
      if (current.current !== job) return;
      current.current = null; job.controller.abort();
      if (active.current) setState({ phase: "error", reason: "uncertain" });
      void refresh();
    }, 25_000);
    try {
      await client.cancelQueries({ queryKey: dosesQueryKey });
      const receipt = await confirmVerifiedDose(slot, job.controller.signal);
      if (current.current !== job || !active.current) return;
      window.clearTimeout(job.timeout); current.current = null;
      setSelected(null); setState({ phase: "saved", receipt });
      await refresh();
    } catch (error) {
      if (current.current !== job || !active.current) return;
      window.clearTimeout(job.timeout); current.current = null;
      const reason: Failure = isApiError(error, "SCAN_TOKEN_INVALID") ? "expired" : isApiError(error, "DOSE_ALREADY_CONFIRMED") ? "already"
        : isApiError(error) && ["DOSE_NOT_DUE", "DOSE_MISSED", "NOT_FOUND"].includes(error.code) ? "changed" : "uncertain";
      setState({ phase: "error", reason });
      await refresh();
    } finally {
      window.clearTimeout(job.timeout);
      if (current.current === job) current.current = null;
    }
  }
  return { state, selected, expired, checking, trigger, open, close, submit };
}
