"use client";

import { Type, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useHousehold } from "@/features/auth";
import { ROUTES, safeInternalPath } from "@/shared/config";
import { AUTH, PREFERENSI } from "@/shared/copy";
import { Button, ChoiceCards, Notice, PageHeader, Spinner } from "@/shared/ui";
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

/**
 * Pilihan keluaran Teks atau Teks + Suara (Figma MOSA DRAFT 09 · 135:2902, MVP-06).
 * Dibuka setelah scan pertama yang cocok (docs/08 §1D) dengan `next` = hasil scan,
 * atau dari Pengaturan/Informasi Obat untuk mengubahnya. Pilihan disimpan di akun.
 */
export function OutputPreferenceScreen({ next }: { next?: string }) {
  const router = useRouter();
  const household = useHousehold();
  const update = useUpdateOutputMode();
  const [choice, setChoice] = useState<OutputMode | null>(null);
  const [failed, setFailed] = useState(false);

  // Bawaan: pilihan tersimpan; bila belum pernah memilih, "Teks saja" (Figma 09).
  const selected: OutputMode = choice ?? household.data?.outputMode ?? "teks";
  const destination = safeInternalPath(next, ROUTES.home);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(false);
    try {
      await update.mutateAsync(selected);
      router.replace(destination);
    } catch {
      setFailed(true);
    }
  }

  if (household.isPending) return <Spinner visibleLabel />;

  return (
    <>
      <PageHeader title={PREFERENSI.judulLayar} />
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
          {next ? PREFERENSI.simpanLihatHasil : PREFERENSI.simpanPilihan}
        </Button>
      </form>
    </>
  );
}
