"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

let lockCount = 0;

function lockScroll() {
  if (lockCount++ === 0) {
    const width = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (width > 0) document.body.style.paddingRight = `${width}px`;
  }
}
function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0;
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** sm = 26rem · md = 34rem · lg = 46rem · xl = 60rem */
  size?: "sm" | "md" | "lg" | "xl";
  /** Impede fechar por clique fora / Esc (formulários sujos). */
  persistent?: boolean;
  hideHeader?: boolean;
}

const SIZE = { sm: "sm:max-w-[26rem]", md: "sm:max-w-[34rem]", lg: "sm:max-w-[46rem]", xl: "sm:max-w-[60rem]" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  persistent = false,
  hideHeader = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const requestClose = useCallback(() => {
    if (!persistent) onClose();
  }, [onClose, persistent]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    lockScroll();

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    // deixa a animação começar antes de mover o foco
    const t = setTimeout(() => (first ?? panel)?.focus({ preventScroll: true }), 40);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      unlockScroll();
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, requestClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="anim-fade absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]"
        onClick={requestClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? undefined : titleId}
        aria-label={hideHeader ? title : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "anim-sheet sm:anim-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden",
          "rounded-t-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]",
          "sm:max-h-[86dvh] sm:rounded-[var(--radius-xl)]",
          SIZE[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 flex-none rounded-full bg-[var(--line-strong)] sm:hidden" />

        {!hideHeader && (
          <header className="flex flex-none items-start gap-3 px-5 pt-4 pb-3.5 sm:pt-5">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[0.9375rem] leading-tight font-semibold tracking-[-0.018em]">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="btn btn-ghost btn-icon btn-sm -mt-1 -mr-1.5"
            >
              <X size={16} />
            </button>
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>

        {footer ? (
          <footer className="flex flex-none items-center justify-end gap-2 border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5">
            {footer}
          </footer>
        ) : (
          <div className="pb-[env(safe-area-inset-bottom,0px)] sm:hidden" />
        )}
      </div>
    </div>,
    document.body,
  );
}
