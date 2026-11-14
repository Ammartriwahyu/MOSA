"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";
import { DRAFT } from "../copy";
import { cx } from "./cx";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;

  description?: ReactNode;

  icon?: ReactNode;
  iconTone?: "danger" | "brand" | "neutral" | "info";

  children?: ReactNode;

  actions?: ReactNode;

  initialFocusRef?: RefObject<HTMLElement | null>;

  returnFocusRef?: RefObject<HTMLElement | null>;

  dismissOnOutsideClick?: boolean;

  closeDisabled?: boolean;

  reserveCloseSpace?: boolean;
};

const ICON_TONE = {
  danger: "bg-danger-icon-soft text-danger",
  brand: "bg-brand-soft text-brand",
  neutral: "bg-canvas text-ink",
  info: "bg-info-soft text-info",
} as const;

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
        <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          ref={contentRef}
          tabIndex={-1}

          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            event.preventDefault();

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

          className="dialog-content fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-app flex-col gap-3 overflow-y-auto rounded-t-sheet bg-surface px-6 pt-3.5 pb-6 outline-none md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[88dvh] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:px-8 md:pt-8 md:pb-8 md:shadow-card"
        >
          <div aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-pill bg-field-border md:hidden" />
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
