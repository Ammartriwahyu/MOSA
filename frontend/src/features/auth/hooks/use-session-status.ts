"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib";

export type SessionStatus = "loading" | "signed-in" | "signed-out";

/**
 * Status sesi Supabase Auth. `INITIAL_SESSION` dikirim saat berlangganan, lalu
 * setiap masuk/keluar/perbarui token; berlaku juga untuk tab lain di HP yang sama.
 */
export function useSessionStatus(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return status;
}
