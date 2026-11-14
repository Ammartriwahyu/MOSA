"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchHousehold, householdQueryKey, recordScanConsent } from "@/features/auth";
import { hasDeviceScanConsent, rememberDeviceScanConsent, subscribeDeviceScanConsent } from "../lib/device-consent";

export const scanConsentQueryKey = (userId: string) => ["scan-consent", userId] as const;
const unseenOnServer = () => false;

export function useScanConsent(userId: string) {
  const client = useQueryClient();
  const deviceConsent = useSyncExternalStore(subscribeDeviceScanConsent, hasDeviceScanConsent, unseenOnServer);
  const [acceptedHere, setAcceptedHere] = useState(false);
  const active = useRef(false);
  const lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const household = useQuery({ queryKey: scanConsentQueryKey(userId), queryFn: ({ signal }) => fetchHousehold(signal),
    staleTime: 0, retry: false, refetchOnMount: "always" });
  const mutation = useMutation({ mutationFn: recordScanConsent, retry: false, networkMode: "always" });
  const serverConsent = household.data?.scanConsentAt != null && household.data.dataConsentAt !== null;
  const ready = household.isSuccess && serverConsent && (deviceConsent || acceptedHere);

  async function accept() {
    if (lock.current || !active.current) return;
    lock.current = true;
    try {
      const saved = await mutation.mutateAsync();
      if (!active.current) return;

      await client.cancelQueries({ queryKey: scanConsentQueryKey(userId) });
      if (!active.current) return;
      client.setQueryData(scanConsentQueryKey(userId), saved);
      rememberDeviceScanConsent();
      setAcceptedHere(true);
      void client.invalidateQueries({ queryKey: householdQueryKey });
    } catch { /* Pesan tetap di dialog; tidak mengulang atau mengantrekan POST. */ }
    finally { lock.current = false; }
  }
  return { ready, household, accepting: mutation.isPending, error: mutation.isError, accept };
}
