"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { householdQueryKey } from "@/features/auth";
import { updateOutputMode } from "../api/preferences";

export function useUpdateOutputMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOutputMode,
    retry: false,
    networkMode: "always",
    onSuccess: async (household) => {
      await queryClient.cancelQueries({ queryKey: householdQueryKey });
      queryClient.setQueryData(householdQueryKey, household);
    },
  });
}
