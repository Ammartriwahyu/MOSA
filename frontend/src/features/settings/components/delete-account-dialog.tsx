"use client";

import { Lock, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { signIn, signOut } from "@/features/auth";
import { AUTH, DRAFT, PENGATURAN, TOMBOL } from "@/shared/copy";
import { isApiError } from "@/shared/lib";
import { Button, Dialog, Notice, TextField } from "@/shared/ui";
import { deleteHouseholdData } from "../api/delete-account";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; email: string | null };

export function DeleteAccountDialog({ open, onOpenChange, email }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  function close(next: boolean) {
    if (busy) return;
    if (!next) {
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted) return;
    if (!email || password.length === 0) {
      setError(AUTH.galatKataSandiKosong);
      return;
    }
    setBusy(true);
    setError(null);

    const verified = await signIn(email, password);

    if (signal.aborted) return;
    if (!verified.ok) {
      setBusy(false);
      setError(verified.reason === "invalid_credentials" ? PENGATURAN.galatKataSandiHapus : AUTH.galatJaringan);
      return;
    }

    try {
      await deleteHouseholdData(signal);
    } catch (failure) {
      if (signal.aborted) return;
      setBusy(false);
      setError(isApiError(failure, "DEMO_PROTECTED") ? PENGATURAN.demoDilindungi : AUTH.galatUmum);
      return;
    }

    if (!signal.aborted) await signOut("local");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={DRAFT.hapusAkunJudul}
      description={DRAFT.hapusAkunPenjelasan}
      icon={<Trash2 className="size-9" />}
      iconTone="danger"
      dismissOnOutsideClick={false}
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Notice>{PENGATURAN.demoDilindungi}</Notice>
        <TextField
          label={PENGATURAN.labelKataSandiUlang}
          type="password"
          autoComplete="current-password"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" variant="danger" size="lg" icon={<Trash2 />} disabled={busy} aria-busy={busy}>
          {PENGATURAN.yaHapusSemua}
        </Button>
        <Button variant="secondary" size="lg" disabled={busy} onClick={() => close(false)}>
          {TOMBOL.batal}
        </Button>
      </form>
    </Dialog>
  );
}
