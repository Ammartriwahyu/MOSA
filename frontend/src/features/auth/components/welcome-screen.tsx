import { ArrowRight, CheckCheck, ChevronRight, Pill, Sunrise } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/shared/config";
import { AUTH } from "@/shared/copy";
import { Badge } from "@/shared/ui";
import { BrandHeader } from "./brand-header";

/** Onboarding (Figma MOSA DRAFT 01 · 135:2722). */
export function WelcomeScreen() {
  return (
    <>
      <BrandHeader />

      {/* Ilustrasi contoh jadwal: dekoratif, bukan data pengguna. */}
      <div aria-hidden="true" className="flex flex-col items-center gap-4.5 rounded-hero bg-linear-to-b from-hero-from to-hero-to p-6">
        <span className="flex aspect-square size-37.5 h-auto max-w-full items-center justify-center rounded-pill bg-surface text-brand shadow-card">
          <Pill className="size-19" />
        </span>
        <div className="flex w-full flex-wrap items-center gap-3 rounded-tile bg-surface p-3.5 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand">
            <Sunrise className="size-5.5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-small text-ink-secondary">{AUTH.ilustrasiJadwal}</span>
            <span className="text-button">{AUTH.ilustrasiObat}</span>
          </span>
          <Badge tone="success" icon={<CheckCheck />}>
            {AUTH.ilustrasiStatus}
          </Badge>
        </div>
      </div>

      <section className="@container flex flex-col gap-3.5 rounded-hero bg-linear-to-b from-brand to-brand-glow p-6 text-on-brand">
        <h1 className="text-center text-display">{AUTH.onboardingJudul}</h1>
        <p className="text-center text-body">{AUTH.onboardingIsi}</p>
        <Link
          href={ROUTES.register}
          className="flex min-h-16 items-center gap-3.5 rounded-pill bg-action py-2 pr-5.5 pl-2 text-on-action @max-[16em]:flex-wrap"
        >
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-field bg-surface text-ink">
            <ArrowRight className="size-6.5" />
          </span>
          <span className="min-w-0 flex-1 text-card-title @max-[16em]:order-3 @max-[16em]:basis-full">{AUTH.mulaiSekarang}</span>
          <span aria-hidden="true" className="ml-auto flex">
            <ChevronRight className="-mr-2.5 size-5 opacity-60" />
            <ChevronRight className="-mr-2.5 size-5 opacity-80" />
            <ChevronRight className="size-5" />
          </span>
        </Link>
      </section>

      <p className="flex flex-wrap items-center justify-center gap-1.5 text-body text-ink-secondary">
        {AUTH.sudahPunyaAkun}
        <Link href={ROUTES.login} className="inline-flex min-h-touch items-center px-1 font-bold text-brand">
          {AUTH.masuk}
        </Link>
      </p>
    </>
  );
}
