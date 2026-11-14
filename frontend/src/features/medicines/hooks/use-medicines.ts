"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMedicine, deactivateMedicine, explainMedicine, getMedicine, listMedicines, updateMedicine, type CreateMedicineInput, type ExplanationInput, type Medicine } from "../api/medicines";

export const medicinesQueryKey = ["medicines"] as const;

export function useMedicines() {
  return useQuery({ queryKey: medicinesQueryKey, queryFn: listMedicines });
}

export function useMedicine(id: string) {
  return useQuery({ queryKey: [...medicinesQueryKey, id], queryFn: () => getMedicine(id) });
}

export function useExplainMedicine() {
  return useMutation({
    mutationFn: ({ input, signal }: { input: ExplanationInput; signal: AbortSignal }) => explainMedicine(input, signal),
    retry: false,
  });
}

export function useCreateMedicine() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createMedicine,
    retry: false,
    onSuccess: (medicine) => {

      client.setQueryData([...medicinesQueryKey, medicine.id], medicine);
      client.setQueryData<Medicine[]>(medicinesQueryKey, (previous) =>
        previous ? [...previous.filter((item) => item.id !== medicine.id), medicine] : undefined,
      );
      void client.invalidateQueries({ queryKey: medicinesQueryKey });
    },
  });
}

export function useUpdateMedicine(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMedicineInput) => updateMedicine(id, input),
    retry: false,
    onSuccess: async (medicine) => {

      await client.cancelQueries({ queryKey: medicinesQueryKey });
      client.setQueryData([...medicinesQueryKey, id], medicine);
      client.setQueryData<Medicine[]>(medicinesQueryKey, (previous) =>
        previous?.map((item) => item.id === id ? medicine : item),
      );
      void client.invalidateQueries({ queryKey: medicinesQueryKey });
    },
  });
}

export function useDeactivateMedicine(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateMedicine(id),
    retry: false,
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: medicinesQueryKey });
      client.setQueryData<Medicine[]>(medicinesQueryKey, (previous) => previous?.filter((item) => item.id !== id));
      client.removeQueries({ queryKey: [...medicinesQueryKey, id], exact: true });

      void client.invalidateQueries({ queryKey: medicinesQueryKey, exact: true });
    },
  });
}
