"use client";

import {
  environmentManager,
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { householdQueryKey, signOut, useSessionIdentity } from "@/features/auth";
import { PwaLifecycle } from "@/features/reminders";
import { isApiError } from "@/shared/lib";
import { MotionProvider } from "@/shared/motion";

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

export function makeQueryClient(isCurrent: () => boolean = () => true): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => { if (isCurrent()) handleGlobalError(error, client); } }),
    mutationCache: new MutationCache({ onError: (error) => { if (isCurrent()) handleGlobalError(error, client); } }),
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

let browserCache: { owner: string | null; client: QueryClient; generation: number } | undefined;

// Pola resmi TanStack Query untuk App Router: satu klien per browser, baru per permintaan di server.
function getQueryClient(owner: string | null) {
  if (environmentManager.isServer()) return { client: makeQueryClient(), generation: 0 };
  // Login pertama mengadopsi cache anonim agar alur register/consent tetap
  // hidup. Pergantian dari akun yang sudah dikenal selalu memakai klien baru.
  if (browserCache?.owner === null && owner !== null) browserCache.owner = owner;
  if (!browserCache || browserCache.owner !== owner) {
    const client: QueryClient = makeQueryClient(() => browserCache?.client === client);
    browserCache = { owner, client, generation: (browserCache?.generation ?? -1) + 1 };
  }
  return browserCache;
}

export function Providers({ children }: { children: ReactNode }) {
  const owner = useSessionIdentity();
  const { client, generation } = getQueryClient(owner);
  useEffect(() => () => { client.clear(); }, [client]);
  // Observer dan mutasi lama tetap mengacu klien lama, sehingga respons yang
  // terlambat tidak dapat memasukkan data ke cache atau mengeluarkan akun baru.
  return (
    <QueryClientProvider key={generation} client={client}>
      <PwaLifecycle />
      <MotionProvider>{children}</MotionProvider>
    </QueryClientProvider>
  );
}
