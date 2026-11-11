"use client";

import { Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ROUTES } from "@/shared/config";
import { AUTH, DRAFT } from "@/shared/copy";
import { Button, CheckboxCard, Notice, PageHeader, TextField } from "@/shared/ui";
import { signUp } from "../api/auth-service";
import { useRecordDataConsent } from "../hooks/use-household";
import { AUTH_FAILURE_MESSAGE, MIN_PASSWORD_LENGTH, isEmail } from "./auth-messages";

type Fields = { name: string; email: string; password: string; confirm: string; consent: boolean };
type FieldErrors = Partial<Record<keyof Fields, string>>;

function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (fields.name.trim().length === 0) errors.name = AUTH.galatNama;
  if (!isEmail(fields.email)) errors.email = AUTH.galatEmail;
  if (fields.password.length < MIN_PASSWORD_LENGTH) errors.password = AUTH.galatKataSandiPendek;
  if (fields.confirm !== fields.password) errors.confirm = AUTH.galatKataSandiBeda;
  // Persetujuan wajib sebelum akun dibuat (PRD §9.1, MVP-01).
  if (!fields.consent) errors.consent = AUTH.galatPersetujuan;
  return errors;
}

/** Daftar akun + persetujuan data (Figma MOSA DRAFT 03 · 135:2844). */
export function RegisterScreen() {
  const router = useRouter();
  const recordConsent = useRecordDataConsent();
  const [fields, setFields] = useState<Fields>({ name: "", email: "", password: "", confirm: "", consent: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(fields);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const result = await signUp({ name: fields.name.trim(), email: fields.email.trim(), password: fields.password });
    if (!result.ok) {
      setSubmitting(false);
      setFormError(AUTH_FAILURE_MESSAGE[result.reason]);
      return;
    }
    if (!result.hasSession) {
      // Konfirmasi email aktif: persetujuan dicatat setelah masuk (layar /consent).
      setSubmitting(false);
      setNeedsEmailConfirmation(true);
      return;
    }
    try {
      await recordConsent.mutateAsync();
    } catch {
      // Gagal mencatat: penjaga rute akan membuka layar persetujuan, data belum disimpan.
    }
    router.replace(ROUTES.home);
  }

  if (needsEmailConfirmation) {
    return (
      <>
        <PageHeader title={AUTH.daftarJudul} backHref={ROUTES.welcome} />
        <Notice tone="info" role="status">
          {AUTH.cekEmail}
        </Notice>
        <Button asChild size="lg">
          <Link href={ROUTES.login}>{AUTH.masuk}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader title={AUTH.daftarJudul} backHref={ROUTES.welcome} />
      <p className="text-body text-ink-secondary">{AUTH.daftarIsi}</p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <TextField
          label={AUTH.labelNamaPasien}
          autoComplete="name"
          icon={<User />}
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
        />
        <TextField
          label={AUTH.labelEmail}
          type="email"
          inputMode="email"
          autoComplete="email"
          icon={<Mail />}
          value={fields.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
        />
        <TextField
          label={AUTH.labelKataSandi}
          type="password"
          autoComplete="new-password"
          icon={<Lock />}
          value={fields.password}
          onChange={(e) => set("password", e.target.value)}
          error={errors.password}
        />
        <TextField
          label={AUTH.labelUlangiKataSandi}
          type="password"
          autoComplete="new-password"
          icon={<Lock />}
          value={fields.confirm}
          onChange={(e) => set("confirm", e.target.value)}
          error={errors.confirm}
        />
        <CheckboxCard
          label={DRAFT.persetujuanData}
          description={AUTH.persetujuanKeterangan}
          checked={fields.consent}
          onChange={(e) => set("consent", e.target.checked)}
          error={errors.consent}
        />
        {formError ? (
          <Notice tone="danger" role="alert">
            {formError}
          </Notice>
        ) : null}
        <Button type="submit" variant="brand" size="lg" disabled={submitting} aria-busy={submitting}>
          {AUTH.buatAkun}
        </Button>
      </form>
    </>
  );
}
