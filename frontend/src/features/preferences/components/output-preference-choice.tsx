"use client";
import { Type, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AUTH, PREFERENSI } from "@/shared/copy";
import { Button, ChoiceCards, Notice } from "@/shared/ui";
import type { OutputMode } from "../api/preferences";
import { useUpdateOutputMode } from "../hooks/use-update-output-mode";
const OPTIONS = [
  {
    value: "teks",
    title: PREFERENSI.teksSaja,
    description: PREFERENSI.teksSajaKeterangan,
    icon: <Type className="size-7" />,
  },
  {
    value: "suara",
    title: PREFERENSI.teksSuara,
    description: PREFERENSI.teksSuaraKeterangan,
    icon: <Volume2 className="size-7" />,
  },
] as const;

export function OutputPreferenceChoice({ outputMode, onSaved, continueToResult = false }: {
  outputMode: OutputMode | null; onSaved: () => void; continueToResult?: boolean;
}) {
  const update = useUpdateOutputMode();
  const [choice, setChoice] = useState<OutputMode | null>(null);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const selected = choice ?? outputMode ?? "teks";
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setFailed(false);
    try { await update.mutateAsync(selected); if (active.current) onSaved(); }
    catch { if (active.current) setFailed(true); }
    finally { lock.current = false; }
  }
  return (
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <ChoiceCards
          legend={PREFERENSI.pertanyaan}
          legendClassName="text-page"
          name="mode-keluaran"
          value={selected}
          onChange={setChoice}
          options={OPTIONS}
        />
        <Notice tone="plain">{PREFERENSI.catatanUbah}</Notice>
        {failed ? (
          <Notice tone="danger" role="alert">
            {AUTH.galatUmum}
          </Notice>
        ) : null}
        <Button type="submit" size="lg" disabled={update.isPending} aria-busy={update.isPending}>
          {continueToResult ? PREFERENSI.simpanLihatHasil : PREFERENSI.simpanPilihan}
        </Button>
      </form>
  );
}

