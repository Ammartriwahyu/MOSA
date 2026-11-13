"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PUSH } from "@/shared/copy";
import { Button, Card, Notice } from "@/shared/ui";
import { disablePush, enablePush, inspectPush, PUSH_CHANGE, pushPublicKey, type PushStatus } from "../lib/push-browser";
import { PwaInstall } from "./pwa-install";

type Status = PushStatus | "loading" | "unavailable" | "failed";
function Controls({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const lifetime = useRef(0);
  const locked = useRef(false);
  const alive = useRef(false);
  const refresh = useCallback(() => {
    const generation = ++lifetime.current;
    void inspectPush().then((value) => { if (alive.current && generation === lifetime.current) setStatus(value); })
      .catch(() => { if (alive.current && generation === lifetime.current) setStatus("failed"); });
  }, []);
  useEffect(() => {
    alive.current = true;
    refresh(); window.addEventListener(PUSH_CHANGE, refresh); window.addEventListener("focus", refresh);
    return () => { alive.current = false; window.removeEventListener(PUSH_CHANGE, refresh); window.removeEventListener("focus", refresh); };
  }, [refresh]);
  function change(enable: boolean) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setFailure(null);
    const work = enable ? enablePush(publicKey) : disablePush();
    void work.catch((error: unknown) => {
      if (alive.current) setFailure(error instanceof Error && error.message === "push-denied" ? PUSH.denied :
        error instanceof Error && error.message === "push-cancelled" ? PUSH.cancelled : PUSH.failed);
    }).finally(() => { locked.current = false; if (alive.current) { setBusy(false); refresh(); } });
  }
  const message = busy ? PUSH.busy : status === "loading" ? PUSH.preparing :
    status === "ios" ? PUSH.disabled : status === "failed" ? PUSH.failed : PUSH[status];
  return <>
    <p role="status" className="text-body">{message}</p>
    {failure ? <Notice tone="danger" role="alert">{failure}</Notice> : null}
    {status === "enabled" || status === "disabled" ? <Button variant={status === "enabled" ? "outline" : "action"}
      icon={status === "enabled" ? <BellOff /> : <Bell />} disabled={busy} aria-busy={busy}
      onClick={() => change(status !== "enabled")}>{status === "enabled" ? PUSH.disable : PUSH.enable}</Button> : null}
    {status === "failed" || status === "denied" ? <Button variant="secondary" disabled={busy} onClick={refresh}>{PUSH.retry}</Button> : null}
  </>;
}
export function PushSettings() {
  const key = pushPublicKey();
  return <Card aria-labelledby="push-heading" className="flex flex-col gap-4">
    <h2 id="push-heading" className="text-card-title">{PUSH.heading}</h2>
    <p className="text-body">{PUSH.explanation}</p>
    {key ? <Controls publicKey={key} /> : <Notice>{PUSH.unavailable}</Notice>}
    <PwaInstall />
  </Card>;
}
