"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib";

/** Memisahkan data sementara scan saat akun berubah, termasuk masuk lewat tab lain. */
export function useSessionIdentity(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return userId;
}
