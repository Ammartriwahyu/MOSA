"use client";

import { Square, Volume2 } from "lucide-react";
import { useId } from "react";
import { DRAFT, SUARA, TOMBOL } from "../copy";
import { useSpeech } from "../hooks";
import { Button } from "./button";

/** text harus sama persis dengan teks yang dirender consumer; tidak ada autoplay atau teks medis tambahan. */
export function Bacakan({ text, active = true, contextKey }: { text: string; active?: boolean; contextKey?: string }) {
  const speech = useSpeech(text, { active, contextKey });
  const statusId = useId();
  const unavailable = speech.availability === "unavailable" || speech.state === "unavailable";
  const message = unavailable ? DRAFT.suaraTidakTersedia : speech.state === "blocked" ? SUARA.blocked : speech.state === "failed" ? SUARA.failed
    : speech.state === "starting" ? SUARA.starting : speech.state === "speaking" ? SUARA.speaking : speech.availability === "checking" ? SUARA.checking : null;
  return <div className="flex min-w-0 flex-col gap-3 [overflow-wrap:anywhere]">
    <Button variant="info" icon={speech.busy ? <Square className="size-6" /> : <Volume2 className="size-6" />}
      aria-describedby={message && active ? statusId : undefined} disabled={!speech.busy && !speech.canSpeak}
      onClick={speech.busy ? speech.stop : speech.speak}>{speech.busy ? SUARA.stop : TOMBOL.bacakan}</Button>
    {message && active ? <div id={statusId} role="status" className={unavailable ? "rounded-tile bg-notice-soft p-4 text-body text-muted" : "text-body text-ink-secondary"}>
      {unavailable ? <p className="mb-2 text-card-title text-ink">{SUARA.readable}</p> : null}
      <p>{message}</p>
    </div> : null}
  </div>;
}
