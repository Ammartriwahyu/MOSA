"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";
import { DRAFT } from "../copy";
import { cx } from "./cx";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul wajib (nama dialog untuk pembaca layar). */
  title: string;
  /** Kalimat utama (mis. kalimat baku #5). */
  description?: ReactNode;
  /** Lingkaran ikon di atas judul (mis. peringatan). */
  icon?: ReactNode;
  iconTone?: "danger" | "brand" | "neutral" | "info";
  /** Isi tambahan di bawah deskripsi (ringkasan data, input). */
  children?: ReactNode;
  /** Tombol aksi, tersusun vertikal. Boleh kosong bila tombol ada di dalam `children` (formulir). */
  actions?: ReactNode;
  /**
   * Elemen yang difokus saat dialog terbuka. Bawaan: kotak dialog itu sendiri,
   * sehingga tombol bahaya tidak pernah menjadi fokus bawaan (docs/06).
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Alur tanpa Radix Trigger (mis. proses AI): pulihkan fokus ke tombol formulir. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** false = tidak tertutup lewat klik latar (dialog penting). Esc tetap menutup. */
  dismissOnOutsideClick?: boolean;
  /** Penulisan sedang berlangsung: jangan menutup sebelum hasil server diketahui. */
  closeDisabled?: boolean;
  /** Ikon besar sudah memisahkan judul dari tombol tutup; consumer boleh membuka lebar judul. */
  reserveCloseSpace?: boolean;
};

const ICON_TONE = {
  danger: "bg-danger-icon-soft text-danger",
  brand: "bg-brand-soft text-brand",
  neutral: "bg-canvas text-ink",
  info: "bg-info-soft text-info",
} as const;

/**
 * Pop-up bergaya bottom sheet (Figma A10): latar gelap, lembar putih sudut 28 px.
 * Radix menjebak fokus, Esc menutup, fokus kembali ke pemicu (docs/06).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  iconTone = "neutral",
  children,
  actions,
  initialFocusRef,
  returnFocusRef,
  dismissOnOutsideClick = true,
  closeDisabled = false,
  reserveCloseSpace = true,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          ref={contentRef}
          tabIndex={-1}
          // Tanpa deskripsi: Radix meminta aria-describedby eksplisit undefined.
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // Consumer memakai tombol biasa, bukan Radix Trigger. Simpan fokus
            // sebelum modal membukanya agar Escape/Batal tidak berakhir di body.
            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            (initialFocusRef?.current ?? contentRef.current)?.focus();
          }}
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef?.current ?? openerRef.current;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
          }}
          onPointerDownOutside={(event) => {
            if (!dismissOnOutsideClick || closeDisabled) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => { if (closeDisabled) event.preventDefault(); }}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-app flex-col gap-3 overflow-y-auto rounded-t-sheet bg-surface px-6 pt-3.5 pb-6 outline-none"
        >
          <div aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-pill bg-field-border" />
          <RadixDialog.Close
            disabled={closeDisabled}
            aria-label={DRAFT.tutup}
            className="absolute top-3 right-3 inline-flex size-touch items-center justify-center rounded-pill text-ink-secondary"
          >
            <X aria-hidden="true" className="size-6" />
          </RadixDialog.Close>
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            {icon ? (
              <span
                aria-hidden="true"
                className={cx("flex size-20 items-center justify-center rounded-pill", ICON_TONE[iconTone])}
              >
                {icon}
              </span>
            ) : null}
            <RadixDialog.Title className={cx("max-w-full text-display break-words", reserveCloseSpace && "px-9")}>{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="max-w-full text-body [overflow-wrap:anywhere]">{description}</RadixDialog.Description>
            ) : null}
          </div>
          {children}
          {actions ? <div className="flex flex-col gap-2.5 pt-1">{actions}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
