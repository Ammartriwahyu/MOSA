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

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status !== null && error.status < 500) return false;
  return failureCount < 2;
}

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

        refetchOnWindowFocus: true,
      },

      mutations: { retry: false },
    },
  });
  return client;
}

let browserCache: { owner: string | null; client: QueryClient; generation: number } | undefined;

function getQueryClient(owner: string | null) {
  if (environmentManager.isServer()) return { client: makeQueryClient(), generation: 0 };

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

  return (
    <QueryClientProvider key={generation} client={client}>
      <PwaLifecycle />
      <MotionProvider>{children}</MotionProvider>
    </QueryClientProvider>
  );
}
