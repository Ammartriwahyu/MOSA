"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib";
import { observePushIdentity, prepareWorker, pushStorageChanged } from "../lib/push-browser";

export function PwaLifecycle() {
  useEffect(() => {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
    void prepareWorker().catch(() => undefined);
    window.addEventListener("storage", pushStorageChanged);
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {

      observePushIdentity(session?.user.id ?? null);
    });
    return () => { data.subscription.unsubscribe(); window.removeEventListener("storage", pushStorageChanged); };
  }, []);
  return null;
}
