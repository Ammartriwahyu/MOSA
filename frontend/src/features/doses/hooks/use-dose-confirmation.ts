"use client";

import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useRef, useState, type RefObject } from "react";
import { CATAT_DOSIS } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { confirmBasicDose } from "../api/doses";
import type { Dose, TodaysDoses } from "../schemas/todays-doses";
import { dosesQueryKey } from "./use-todays-doses";

export function allDoses(data?: TodaysDoses): Dose[] {
  return data ? [...data.carryoverDoses, ...data.doses, ...data.earlyDoses] : [];
}

function reviewKey(dose: Dose): string {
  return JSON.stringify([dose.slotId, dose.scheduledAt, dose.medicine.name, dose.medicine.strength, dose.medicine.doseAmount, dose.medicine.usageRule]);
}

export function useDoseConfirmation(query: UseQueryResult<TodaysDoses, Error>, fallbackFocus: RefObject<HTMLElement | null>) {
  const client = useQueryClient();
  // Jangan mengantre konfirmasi offline untuk dijalankan otomatis ketika tersambung lagi.
  const mutation = useMutation({ mutationFn: confirmBasicDose, retry: false, networkMode: "always" });
  const [selected, setSelected] = useState<Dose | null>(null);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "saved" | "already"; dose: Dose } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const current = allDoses(query.data).find((dose) => dose.slotId === selected?.slotId);
  const unchanged = selected && current && reviewKey(selected) === reviewKey(current);
  const changed = selected && (!current || !unchanged || current.status !== "jatuh_tempo");
  const healthy = query.isSuccess && query.fetchStatus !== "paused";
  const canConfirm = Boolean(selected && verified && healthy && !query.isFetching && !checking && !busy && !changed);

  function close(force = false) {
    if (locked.current && !force) return;
    generation.current += 1;
    returnFocusRef.current = force ? fallbackFocus.current : trigger.current?.isConnected ? trigger.current : fallbackFocus.current;
    setSelected(null);
  }

  async function check(dose: Dose, token: number) {
    setVerified(false); setChecking(true); setError(null);
    const result = await query.refetch();
    if (generation.current !== token) return;
    setChecking(false);
    if (!result.isSuccess) { setError(CATAT_DOSIS.gagalMuat); return; }
    const fresh = allDoses(result.data).find((row) => row.slotId === dose.slotId);
    if (fresh?.status === "sudah") { setNotice({ kind: "already", dose }); close(true); return; }
    setVerified(true);
  }

  function open(dose: Dose, button: HTMLButtonElement) {
    if (locked.current || dose.status !== "jatuh_tempo") return;
    trigger.current = button; returnFocusRef.current = button;
    setSelected(dose); setNotice(null); setError(null);
    void check(dose, ++generation.current);
  }

  async function submit() {
    if (!canConfirm || !selected || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      await client.cancelQueries({ queryKey: dosesQueryKey });
      await mutation.mutateAsync(selected.slotId);
      setNotice({ kind: "saved", dose: selected }); close(true);
      // Batalkan GET lama (termasuk polling selama POST), lalu minta ringkasan server.
      await client.cancelQueries({ queryKey: dosesQueryKey });
      await client.invalidateQueries({ queryKey: dosesQueryKey });
    } catch (cause) {
      if (isApiError(cause, "DOSE_ALREADY_CONFIRMED")) {
        setNotice({ kind: "already", dose: selected }); close(true);
        await client.cancelQueries({ queryKey: dosesQueryKey });
        await client.invalidateQueries({ queryKey: dosesQueryKey });
      } else {
        setVerified(false);
        setError(isApiError(cause) && ["DOSE_NOT_DUE", "DOSE_MISSED", "NOT_FOUND"].includes(cause.code) ? CATAT_DOSIS.jadwalBerubah : CATAT_DOSIS.belumPasti);
      }
    } finally { locked.current = false; setBusy(false); }
  }

  return {
    selected, busy, checking, notice, canConfirm, returnFocusRef, open, close, submit,
    error: error ?? (selected && !checking && changed ? CATAT_DOSIS.jadwalBerubah : null),
    recheck: () => { if (selected && !locked.current) void check(selected, generation.current); },
  };
}
