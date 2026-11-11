"use client";

import { useQuery } from "@tanstack/react-query";
import { getMedicine, listMedicines } from "../api/medicines";

/** Kunci cache obat; mutasi (tambah/ubah/hapus) membatalkan seluruh awalan ini. */
export const medicinesQueryKey = ["medicines"] as const;

export function useMedicines() {
  return useQuery({ queryKey: medicinesQueryKey, queryFn: listMedicines });
}

export function useMedicine(id: string) {
  return useQuery({ queryKey: [...medicinesQueryKey, id], queryFn: () => getMedicine(id) });
}
