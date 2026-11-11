"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMedicine, explainMedicine, getMedicine, listMedicines, type ExplanationInput, type Medicine } from "../api/medicines";

/** Kunci cache obat; mutasi (tambah/ubah/hapus) membatalkan seluruh awalan ini. */
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
      // Cache diperbarui hanya setelah server berhasil menyimpan.
      client.setQueryData([...medicinesQueryKey, medicine.id], medicine);
      client.setQueryData<Medicine[]>(medicinesQueryKey, (previous) =>
        previous ? [...previous.filter((item) => item.id !== medicine.id), medicine] : undefined,
      );
      void client.invalidateQueries({ queryKey: medicinesQueryKey });
    },
  });
}
