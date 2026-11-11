"use client";

import { useQuery } from "@tanstack/react-query";
import { getTodaysDoses } from "../api/doses";

export const dosesQueryKey = ["doses", "today"] as const;

export function useTodaysDoses() {
  return useQuery({
    queryKey: dosesQueryKey,
    queryFn: ({ signal }) => getTodaysDoses(signal),
    // Kembali dari mengubah obat harus meminta jadwal terbaru.
    staleTime: 0,
  });
}
