"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
  separatorBefore?: boolean;
  sectionLabel?: string;
}

interface MenuProps {
  items: MenuItem[];
  trigger: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; "aria-expanded"?: boolean }>;
  align?: "start" | "end";
  /** Título mostrado apenas na folha mobile. */
  sheetTitle?: string;
  widthClass?: string;
}

const MOBILE = 640;

export function Menu({ items, trigger, align = "end", sheetTitle, widthClass = "min-w-[13rem]" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  const place = useCallback(() => {
    const el = anchorRef.current?.firstElementChild as HTMLElement | undefined;
    const panel = panelRef.current;
    if (!el || !panel) return;
    const r = el.getBoundingClientRect();
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    let left = align === "end" ? r.right - pw : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - pw - 8);
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    setPos({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open && !sheet) place();
  }, [open, sheet, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      const usable = items.filter((i) => !i.disabled);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((prev) => {
          const dir = e.key === "ArrowDown" ? 1 : -1;
          const next = (prev + dir + usable.length) % usable.length;
          return next;
        });
      }
      if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        const item = usable[active];
        if (item) select(item);
      }
    };
    const onScroll = () => (sheet ? undefined : place());
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, items, place, sheet]);

  function select(item: MenuItem) {
    if (item.disabled) return;
    setOpen(false);
    if (item.href) {
      window.location.href = item.href;
      return;
    }
    item.onSelect?.();
  }

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSheet(window.innerWidth < MOBILE);
    setActive(-1);
    setOpen((v) => !v);
  }

  const clone = isValidElement(trigger)
    ? cloneElement(trigger, { onClick: toggle, "aria-expanded": open })
    : trigger;

  const list = (
    <ul className="py-1" role="menu">
      {items.map((item, i) => {
        const idx = items.filter((x) => !x.disabled).indexOf(item);
        return (
          <li key={item.key} role="none">
            {item.separatorBefore ? <div className="my-1 h-px bg-[var(--line-soft)]" /> : null}
            {item.sectionLabel ? (
              <p className="px-3 pt-2 pb-1 text-[0.625rem] font-semibold tracking-[0.09em] text-[var(--text-4)] uppercase">
                {item.sectionLabel}
              </p>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onMouseEnter={() => setActive(idx)}
              onClick={() => select(item)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 text-left text-[0.8125rem] transition-colors",
                sheet ? "h-11" : "h-8",
                item.disabled && "cursor-not-allowed opacity-45",
                item.danger ? "text-[var(--bad)]" : "text-[var(--text-2)]",
                !item.disabled && active === idx && !item.danger && "bg-[var(--surface-3)] text-[var(--text)]",
                !item.disabled && active === idx && item.danger && "bg-[color-mix(in_oklab,var(--bad)_12%,transparent)]",
              )}
            >
              {item.icon ? <span className="flex-none opacity-80">{item.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.checked ? <Check size={14} className="flex-none text-[var(--accent)]" /> : null}
              {item.shortcut ? <kbd className="kbd flex-none">{item.shortcut}</kbd> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <span ref={anchorRef} className="contents">
        {clone}
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            sheet ? (
              <div className="fixed inset-0 z-[85] flex items-end">
                <div className="anim-fade absolute inset-0 bg-[var(--scrim)]" onClick={() => setOpen(false)} />
                <div className="anim-sheet relative w-full rounded-t-[var(--radius-xl)] border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] shadow-[var(--shadow-lg)]">
                  <div className="mx-auto mt-2.5 mb-1 h-1 w-9 rounded-full bg-[var(--line-strong)]" />
                  {sheetTitle ? (
                    <p className="px-4 pt-1.5 pb-1 text-xs font-semibold text-[var(--text-3)]">{sheetTitle}</p>
                  ) : null}
                  <div ref={panelRef} className="max-h-[70dvh] overflow-y-auto pb-2">
                    {list}
                  </div>
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                style={{ top: pos.top, left: pos.left }}
                className={cn(
                  "anim-pop fixed z-[85] overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]",
                  widthClass,
                )}
              >
                {list}
              </div>
            ),
            document.body,
          )
        : null}
    </>
  );
}
