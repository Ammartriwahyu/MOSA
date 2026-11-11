"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { householdQueryKey } from "@/features/auth";
import { updateOutputMode } from "../api/preferences";

export function useUpdateOutputMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOutputMode,
    onSuccess: (household) => queryClient.setQueryData(householdQueryKey, household),
  });
}
