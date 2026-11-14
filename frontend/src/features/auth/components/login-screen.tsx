"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ROUTES } from "@/shared/config";
import { AUTH } from "@/shared/copy";
import { Button, Notice, TextField } from "@/shared/ui";
import { signIn } from "../api/auth-service";
import { AUTH_FAILURE_MESSAGE, isEmail } from "./auth-messages";
import { BrandHeader } from "./brand-header";

type FieldErrors = { email?: string; password?: string };

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function enter(emailValue: string, passwordValue: string) {
    setSubmitting(true);
    const result = await signIn(emailValue, passwordValue);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(AUTH_FAILURE_MESSAGE[result.reason]);
      return;
    }
    router.replace(ROUTES.home);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (!isEmail(email)) errors.email = AUTH.galatEmail;
    if (password.length === 0) errors.password = AUTH.galatKataSandiKosong;
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    await enter(email.trim(), password);
  }

  return (
    <>
      <BrandHeader />
      <h1 className="text-hero">{AUTH.masukJudul}</h1>
      <p className="text-body text-ink-secondary">{AUTH.masukIsi}</p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4.5">
        <TextField
          label={AUTH.labelEmail}
          type="email"
          inputMode="email"
          autoComplete="email"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label={AUTH.labelKataSandi}
          type="password"
          autoComplete="current-password"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Notice tone="brand">{AUTH.tetapMasuk}</Notice>
        {formError ? (
          <Notice tone="danger" role="alert">
            {formError}
          </Notice>
        ) : null}
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {AUTH.masuk}
        </Button>
      </form>

      <p className="flex flex-wrap items-center justify-center gap-1.5 text-body text-ink-secondary">
        {AUTH.belumPunyaAkun}
        <Link href={ROUTES.register} className="inline-flex min-h-touch items-center px-1 font-bold text-brand">
          {AUTH.daftarAkunBaru}
        </Link>
      </p>
    </>
  );
}
