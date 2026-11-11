"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccount } from "../api/auth-service";
import { fetchHousehold, householdQueryKey, recordDataConsent } from "../api/household";

/** Status persetujuan, pilihan keluaran, dan penanda akun demo milik sesi ini. */
export function useHousehold(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: householdQueryKey,
    queryFn: ({ signal }) => fetchHousehold(signal),
    enabled: options.enabled ?? true,
  });
}

export function useRecordDataConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordDataConsent,
    onSuccess: (household) => queryClient.setQueryData(householdQueryKey, household),
  });
}

/** Email dan nama pasien sesi ini (untuk Pengaturan dan sapaan). */
export function useAccount() {
  return useQuery({ queryKey: ["account"], queryFn: getAccount, staleTime: Infinity });
}
