"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/shared/config";
import { AUTH, DRAFT } from "@/shared/copy";
import { Button, CheckboxCard, Notice, PageHeader, Spinner } from "@/shared/ui";
import { signOut } from "../api/auth-service";
import { useHousehold, useRecordDataConsent } from "../hooks/use-household";

/**
 * Persetujuan data untuk sesi yang belum menyetujui (mis. daftar dengan konfirmasi
 * email, atau backend membalas CONSENT_REQUIRED). Tidak ada di Figma: memakai pola
 * kotak persetujuan layar 03.
 */
export function ConsentScreen() {
  const router = useRouter();
  const household = useHousehold();
  const recordConsent = useRecordDataConsent();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyConsented = Boolean(household.data?.dataConsentAt);
  useEffect(() => {
    if (alreadyConsented) router.replace(ROUTES.home);
  }, [alreadyConsented, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checked) {
      setError(AUTH.galatPersetujuan);
      return;
    }
    setError(null);
    try {
      await recordConsent.mutateAsync();
      router.replace(ROUTES.home);
    } catch {
      setError(AUTH.galatUmum);
    }
  }

  if (household.isPending || alreadyConsented) return <Spinner visibleLabel />;

  return (
    <>
      <PageHeader title={AUTH.persetujuanJudul} />
      <p className="text-body text-ink-secondary">{AUTH.persetujuanIsi}</p>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CheckboxCard
          label={DRAFT.persetujuanData}
          description={AUTH.persetujuanKeterangan}
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            setError(null);
          }}
          error={error === AUTH.galatPersetujuan ? error : undefined}
        />
        {error && error !== AUTH.galatPersetujuan ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" variant="brand" size="lg" disabled={recordConsent.isPending} aria-busy={recordConsent.isPending}>
          {AUTH.setujuLanjutkan}
        </Button>
        <Button variant="outline" size="lg" icon={<LogOut />} onClick={() => void signOut()}>
          {AUTH.keluar}
        </Button>
      </form>
    </>
  );
}
