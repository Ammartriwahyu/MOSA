"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PUSH } from "@/shared/copy";
import { Button } from "@/shared/ui";
import { isInstalled, isIos } from "../lib/push-browser";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<"normal" | "ios" | "installed">("normal");
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    const refresh = () => setMode(isInstalled() ? "installed" : isIos() ? "ios" : "normal");
    const offered = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const installed = () => { setPrompt(null); setMode("installed"); };
    queueMicrotask(refresh); window.addEventListener("beforeinstallprompt", offered); window.addEventListener("appinstalled", installed);
    return () => { alive.current = false; window.removeEventListener("beforeinstallprompt", offered); window.removeEventListener("appinstalled", installed); };
  }, []);
  return <div className="flex flex-col gap-3">
    <h3 className="text-card-title">{PUSH.installHeading}</h3>
    <p className="text-body">{mode === "installed" ? PUSH.installed : mode === "ios" ? PUSH.iosHint : PUSH.installHint}</p>
    {mode === "normal" && prompt ? <Button variant="outline" icon={<Download />} disabled={busy} aria-busy={busy} onClick={() => {
      setBusy(true); void prompt.prompt().then(() => prompt.userChoice).catch(() => undefined)
        .finally(() => { if (alive.current) { setPrompt(null); setBusy(false); } });
    }}>{PUSH.install}</Button> : null}
  </div>;
}
