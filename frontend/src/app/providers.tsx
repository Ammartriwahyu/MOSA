"use client";

import {
  environmentManager,
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { householdQueryKey, signOut } from "@/features/auth";
import { isApiError } from "@/shared/lib";

/** Galat 4xx (validasi, izin, dosis sudah tercatat) tidak akan berubah bila diulang. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status !== null && error.status < 500) return false;
  return failureCount < 2;
}

/**
 * Penanganan galat global (P08 tugas 5):
 * - CONSENT_REQUIRED → muat ulang status rumah tangga; AuthGuard lalu membuka /consent.
 * - UNAUTHENTICATED → keluar; AuthGuard lalu membuka onboarding.
 */
function handleGlobalError(error: unknown, client: QueryClient): void {
  if (isApiError(error, "CONSENT_REQUIRED")) {
    void client.invalidateQueries({ queryKey: householdQueryKey });
  } else if (isApiError(error, "UNAUTHENTICATED")) {
    void signOut();
  }
}

export function makeQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => handleGlobalError(error, client) }),
    mutationCache: new MutationCache({ onError: (error) => handleGlobalError(error, client) }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: shouldRetry,
        // Dua HP satu akun: data diperbarui saat aplikasi kembali dibuka (AC-01).
        refetchOnWindowFocus: true,
      },
      // Mutasi (konfirmasi minum, simpan obat) tidak diulang otomatis: bisa tercatat ganda.
      mutations: { retry: false },
    },
  });
  return client;
}

let browserQueryClient: QueryClient | undefined;

// Pola resmi TanStack Query untuk App Router: satu klien per browser, baru per permintaan di server.
function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
