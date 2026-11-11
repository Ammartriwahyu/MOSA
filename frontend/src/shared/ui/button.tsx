"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

// Figma MOSA DRAFT: tombol kapsul (pill). Tinggi 56 px (aksi utama) atau 60 px
// (layar hasil/pengaturan); docs/06 minimum 56 px untuk tombol utama.
const VARIANT = {
  /** Aksi utama: kapsul gelap (Scan Obat, Foto Obat yang Benar). */
  action: "bg-action text-on-action",
  /** Hijau brand (Figma 03: Buat Akun). */
  brand: "bg-brand text-on-brand",
  /** Sekunder: abu muda (Kembali ke Jadwal, Batal, Sudah minum tanpa scan). */
  secondary: "bg-secondary text-ink",
  /** Bahaya padat (Ya, hapus semua). */
  danger: "bg-danger text-on-brand",
  /** Garis gelap di latar putih (Keluar dari Akun). */
  outline: "border-2 border-action bg-surface text-ink",
  /** Garis merah di latar putih (Hapus Seluruh Data & Akun). */
  "danger-outline": "border-2 border-danger bg-surface text-danger",
  /** Biru muda (Bacakan di latar terang). */
  info: "border-2 border-info-border bg-info-soft text-info",
} as const;

const SIZE = {
  md: "h-action",
  lg: "h-action-lg",
} as const;

export type ButtonVariant = keyof typeof VARIANT;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  /** Ikon di kiri label (dekoratif; label teks wajib ada). */
  icon?: ReactNode;
  /** Lebar penuh (bawaan, sesuai Figma). */
  fullWidth?: boolean;
  /** Pakai elemen anak (mis. Link) dengan gaya tombol. */
  asChild?: boolean;
};

export function Button({
  variant = "action",
  size = "md",
  icon,
  fullWidth = true,
  asChild = false,
  className,
  type,
  children,
  ...props
}: ButtonProps) {
  const classes = cx(
    "inline-flex items-center justify-center gap-2.5 rounded-pill px-5 text-button",
    "transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-secondary disabled:text-muted",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button type={type ?? "button"} className={classes} {...props}>
      {icon ? (
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
