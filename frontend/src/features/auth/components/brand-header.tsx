import { Pill } from "lucide-react";
import { AUTH, NAMA_APLIKASI } from "@/shared/copy";

/** Merek di atas layar masuk/onboarding (Figma 01, 02). Nama dari copy (keputusan D7). */
export function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex size-touch shrink-0 items-center justify-center rounded-pill bg-brand text-on-brand">
        <Pill className="size-6.5" />
      </span>
      <div className="flex flex-col">
        <span className="text-wordmark">{NAMA_APLIKASI}</span>
        <span className="text-small text-ink-secondary">{AUTH.tagline}</span>
      </div>
    </div>
  );
}
