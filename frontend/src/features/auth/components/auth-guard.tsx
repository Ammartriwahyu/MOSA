"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ROUTES } from "@/shared/config";
import { Spinner } from "@/shared/ui";
import { useSessionStatus } from "../hooks/use-session-status";

/**
 * Penjaga rute halaman setelah masuk. Belum masuk → ke /login. Saat keluar,
 * cache data dihapus agar data akun sebelumnya tidak tampil di HP yang sama.
 * Keamanan data tetap di backend (token diverifikasi tiap permintaan).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === "signed-out") {
      queryClient.clear();
      router.replace(ROUTES.login);
    }
  }, [status, queryClient, router]);

  if (status !== "signed-in") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner visibleLabel />
      </div>
    );
  }
  return children;
}
