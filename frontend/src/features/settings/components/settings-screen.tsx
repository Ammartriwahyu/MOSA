"use client";

import { Check, LogOut, Trash2, Type, Volume2 } from "lucide-react";
import { useState } from "react";
import { signOut, useAccount, useHousehold } from "@/features/auth";
import { useUpdateOutputMode, type OutputMode } from "@/features/preferences";
import { PushSettings } from "@/features/reminders";
import { ROUTES } from "@/shared/config";
import { AUTH, PENGATURAN, PREFERENSI } from "@/shared/copy";
import { Button, Card, ChoiceCards, ErrorState, Notice, PageHeader, Spinner } from "@/shared/ui";
import { DeleteAccountDialog } from "./delete-account-dialog";

const OUTPUT_OPTIONS = [
  { value: "teks", title: PREFERENSI.teksSaja, description: PENGATURAN.teksSajaKeterangan, icon: <Type className="size-7" /> },
  { value: "suara", title: PREFERENSI.teksSuara, description: PENGATURAN.teksSuaraKeterangan, icon: <Volume2 className="size-7" /> },
] as const;

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <dt className="w-30 max-w-full shrink-0 text-body text-ink-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 basis-32 text-body font-bold break-words">{value}</dd>
    </div>
  );
}

/**
 * Pengaturan (Figma MOSA DRAFT 22 · 135:4687): keluaran Teks/Suara, akun bersama,
 * ringkasan privasi, hapus data & akun, keluar. Baris "Dipakai di: 2 HP" di Figma
 * tidak ditampilkan: aplikasi tidak melacak perangkat (tanpa data karangan).
 */
export function SettingsScreen() {
  const household = useHousehold();
  const account = useAccount();
  const updateOutput = useUpdateOutputMode();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (household.isPending) return <Spinner visibleLabel />;
  if (household.isError) {
    return (
      <ErrorState
        title={AUTH.galatUmum}
        action={
          <Button variant="secondary" onClick={() => void household.refetch()}>
            {AUTH.cobaLagi}
          </Button>
        }
      />
    );
  }

  const { isDemo, outputMode } = household.data;

  function changeOutput(mode: OutputMode) {
    setSaveFailed(false);
    updateOutput.mutate(mode, { onError: () => setSaveFailed(true) });
  }

  return (
    <>
      <PageHeader title={PENGATURAN.judul} backHref={ROUTES.home} />

      {/* ≥ 1024 px: dua kolom (Figma Desktop 22 · 184:2259): pilihan dan akun di kiri,
          privasi dan tindakan akun di kanan. Urutan DOM sama dengan mobile. */}
      <div className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4">
      <ChoiceCards
        legend={PENGATURAN.caraMenampilkan}
        name="mode-keluaran"
        value={updateOutput.isPending ? updateOutput.variables : outputMode}
        onChange={changeOutput}
        options={OUTPUT_OPTIONS}
      />
      <div aria-live="polite" className="contents">
        {updateOutput.isSuccess ? <p className="text-body text-success">{PENGATURAN.tersimpan}</p> : null}
      </div>
      {saveFailed ? (
        <Notice tone="danger" role="alert">
          {AUTH.galatUmum}
        </Notice>
      ) : null}

      <PushSettings />
      <h2 className="pt-1 text-card-title">{PENGATURAN.akunBersama}</h2>
      <Card>
        <dl className="flex flex-col gap-3">
          {account.data?.name ? <AccountRow label={PENGATURAN.labelNama} value={account.data.name} /> : null}
          {account.data?.email ? <AccountRow label={PENGATURAN.labelEmail} value={account.data.email} /> : null}
          <AccountRow label={PENGATURAN.labelTetapMasuk} value={PENGATURAN.tetapMasukAktif} />
        </dl>
      </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
      <h2 className="pt-1 text-card-title">{PENGATURAN.dataPrivasi}</h2>
      <Card>
        <ul className="flex flex-col gap-3">
          {[PENGATURAN.privasiFoto, PENGATURAN.privasiAi].map((item) => (
            <li key={item} className="flex items-center gap-3 text-body">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-success-soft text-success">
                <Check className="size-4.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      {isDemo ? <Notice>{PENGATURAN.demoDilindungi}</Notice> : null}
      <Button
        variant="danger-outline"
        size="lg"
        icon={<Trash2 />}
        disabled={isDemo}
        onClick={() => setDeleteOpen(true)}
      >
        {PENGATURAN.hapusAkun}
      </Button>
      <Button variant="outline" size="lg" icon={<LogOut />} disabled={leaving} aria-busy={leaving} onClick={() => {
        setLeaving(true); void signOut().finally(() => setLeaving(false));
      }}>
        {AUTH.keluar}
      </Button>
      </div>
      </div>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} email={account.data?.email ?? null} />
    </>
  );
}
