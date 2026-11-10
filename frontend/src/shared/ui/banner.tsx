import type { ReactNode } from "react";

export type BannerProps = {
  /** Kalimat utama (mis. copy B1 "Sekarang waktunya minum …"). */
  title: string;
  /** Chip waktu di atas judul (mis. "07.00–09.00 WIB"), opsional. */
  eyebrow?: ReactNode;
  /** Detail di bawah judul. */
  children?: ReactNode;
  /** Tombol (Scan Obat, Bacakan). */
  actions?: ReactNode;
};

/**
 * Banner pengingat dosis jatuh tempo (Figma 05: gradasi hijau). `aria-live`
 * agar pembaca layar mengumumkan perubahan (docs/06). Teks diletakkan di bagian
 * atas gradasi; ujung terang (#3d8466) hanya 4,48:1 untuk teks putih (screen-map S6).
 */
export function Banner({ title, eyebrow, children, actions }: BannerProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-card bg-linear-to-b from-brand-strong to-brand-light px-5 py-4 text-on-brand"
    >
      {eyebrow ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-on-brand/20 px-3 py-1.5 text-body font-semibold">
          {eyebrow}
        </span>
      ) : null}
      <p className="text-page">{title}</p>
      {children ? <div className="text-body">{children}</div> : null}
      {actions ? <div className="mt-1 flex flex-col gap-2">{actions}</div> : null}
    </section>
  );
}
