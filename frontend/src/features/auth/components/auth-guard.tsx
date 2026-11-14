"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, type ReactNode } from "react";
import { ROUTES } from "@/shared/config";
import { AUTH } from "@/shared/copy";
import { Button, ErrorState, Spinner } from "@/shared/ui";
import { useHousehold } from "../hooks/use-household";
import { useSessionStatus } from "../hooks/use-session-status";
import { useSessionIdentity } from "../hooks/use-session-identity";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner visibleLabel />
    </div>
  );
}

export function AuthGuard({ children, requireConsent = true }: { children: ReactNode; requireConsent?: boolean }) {
  const status = useSessionStatus();
  const userId = useSessionIdentity();
  const router = useRouter();
  const queryClient = useQueryClient();
  const household = useHousehold({ enabled: status === "signed-in" && requireConsent });
  const missingConsent = requireConsent && household.isSuccess && household.data.dataConsentAt === null;

  useEffect(() => {
    if (status === "signed-out") {
      queryClient.clear();
      router.replace(ROUTES.welcome);
    }
  }, [status, queryClient, router]);

  useEffect(() => {
    if (missingConsent) router.replace(ROUTES.consent);
  }, [missingConsent, router]);

  if (status !== "signed-in") return <FullScreenSpinner />;
  if (requireConsent) {
    if (household.isError) {
      return (
        <div className="mx-auto flex min-h-dvh max-w-app items-center px-gutter">
          <ErrorState
            title={AUTH.galatUmum}
            action={
              <Button variant="secondary" onClick={() => void household.refetch()}>
                {AUTH.cobaLagi}
              </Button>
            }
          />
        </div>
      );
    }
    if (household.isPending || missingConsent) return <FullScreenSpinner />;
  }

  return <Fragment key={userId}>{children}</Fragment>;
}
