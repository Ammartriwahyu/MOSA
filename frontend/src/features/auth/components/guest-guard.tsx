"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ROUTES } from "@/shared/config";
import { Spinner } from "@/shared/ui";
import { useSessionStatus } from "../hooks/use-session-status";

export function GuestGuard({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-in") router.replace(ROUTES.home);
  }, [status, router]);

  if (status !== "signed-out") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner visibleLabel />
      </div>
    );
  }
  return children;
}
