"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, ExternalLink, Search, X } from "lucide-react";

import { Icon } from "@/components/Icon";
import { KIND_LABEL, type SearchEntry, type SearchKind } from "@/lib/search-types";
import { cn, fuzzyScore, prettyUrl } from "@/lib/utils";

export interface CommandAction {
  id: string;
  title: string;
  subtitle: string;
  keywords: string;
  icon: string;
  href?: string;
  run?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  index: SearchEntry[];
  actions: CommandAction[];
  recent: SearchEntry[];
}

type Result = SearchEntry & { score: number; group: string };

const GROUP_ORDER = ["Ações", "Projetos", "Links de projeto", "Ferramentas", "Clientes", "Navegar", "Categorias", "Tags", "Notas"];
const RECENT_KEY = "nexus-cmd-recent";
const MAX_RESULTS = 40;

export function CommandPalette({ open, onClose, index, actions, recent }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    try {
      setHistory(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"));
    } catch {
      setHistory([]);
    }
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const actionEntries = useMemo<SearchEntry[]>(
    () =>
      actions.map((a) => ({
        id: a.id,
        kind: "page" as SearchKind,
        title: a.title,
        subtitle: a.subtitle,
        keywords: a.keywords,
        href: a.href,
        icon: a.icon,
        accent: "indigo",
        badge: undefined,
        boost: 100,
      })),
    [actions],
  );

  const actionIds = useMemo(() => new Set(actions.map((a) => a.id)), [actions]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    const groupOf = (e: SearchEntry) => (actionIds.has(e.id) ? "Ações" : KIND_LABEL[e.kind]);

    if (!q) {
      const pinned = [...recent, ...index.filter((e) => e.kind === "project" && e.boost >= 30)];
      const seen = new Set<string>();
      const base = [...actionEntries.slice(0, 4), ...pinned].filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      return base.slice(0, 14).map((e) => ({ ...e, score: 0, group: groupOf(e) }));
    }

    const scored: Result[] = [];
    for (const entry of [...actionEntries, ...index]) {
      const titleScore = fuzzyScore(entry.title, q);
      const subScore = fuzzyScore(entry.subtitle, q);
      const kwScore = fuzzyScore(entry.keywords, q);
      const best = Math.max(titleScore * 1.6, subScore * 0.7, kwScore * 0.45);
      if (best <= 0) continue;
      scored.push({ ...entry, score: best + entry.boost, group: groupOf(entry) });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
  }, [query, index, actionEntries, actionIds, recent]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const r of results) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()].sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a[0]);
      const ib = GROUP_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [results]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => setActive(0), [query]);

  const select = useCallback(
    (entry: Result | undefined) => {
      if (!entry) return;
      try {
        const next = [entry.id, ...history.filter((h) => h !== entry.id)].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* sem storage */
      }
      onClose();
      if (entry.url) {
        window.open(entry.url, "_blank", "noopener,noreferrer");
      } else if (entry.href) {
        router.push(entry.href);
      }
    },
    [history, onClose, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        select(flat[active]);
      } else if (e.key === "Home") {
        setActive(0);
      } else if (e.key === "End") {
        setActive(Math.max(0, flat.length - 1));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, flat, active, select, onClose]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || typeof document === "undefined") return null;

  let cursor = -1;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]">
      <div className="anim-fade absolute inset-0 bg-[var(--scrim)] backdrop-blur-[3px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar e executar"
        className="anim-pop relative flex max-h-[76dvh] w-full max-w-[38rem] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
      >
        <div className="flex flex-none items-center gap-2.5 border-b border-[var(--line-soft)] px-4">
          <Search size={17} className="flex-none text-[var(--text-4)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar projetos, links, ferramentas ou executar ações…"
            aria-label="Buscar"
            className="h-[3.25rem] min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-4)]"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="btn btn-ghost btn-icon btn-sm"
              aria-label="Limpar"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="kbd hidden sm:flex">esc</kbd>
          )}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
          {flat.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[0.8125rem] text-[var(--text-2)]">Nada encontrado para “{query}”.</p>
              <p className="mt-1 text-xs text-[var(--text-4)]">
                Tente o nome do projeto, o serviço (Railway, GitHub) ou um status.
              </p>
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-2 pb-1 text-[0.625rem] font-semibold tracking-[0.1em] text-[var(--text-4)] uppercase">
                  {group}
                </p>
                {items.map((entry) => {
                  cursor += 1;
                  const isActive = cursor === active;
                  const myIndex = cursor;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-active={isActive}
                      onMouseMove={() => setActive(myIndex)}
                      onClick={() => select(entry)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        isActive ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]",
                      )}
                    >
                      <span
                        className={cn("ac-" + entry.accent, "flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border")}
                        style={{
                          background: "color-mix(in oklab, var(--ac) 12%, transparent)",
                          borderColor: "color-mix(in oklab, var(--ac) 22%, transparent)",
                          color: "var(--ac)",
                        }}
                      >
                        <Icon name={entry.icon} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-medium text-[var(--text)]">
                          {entry.title}
                        </span>
                        <span className="block truncate text-[0.6875rem] text-[var(--text-4)]">
                          {entry.url ? prettyUrl(entry.url) : entry.subtitle}
                        </span>
                      </span>
                      {entry.badge ? <span className="chip chip-quiet flex-none">{entry.badge}</span> : null}
                      {isActive ? (
                        entry.url ? (
                          <ExternalLink size={13} className="flex-none text-[var(--text-4)]" />
                        ) : (
                          <ArrowRight size={13} className="flex-none text-[var(--text-4)]" />
                        )
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="hidden flex-none items-center gap-4 border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-4 py-2 text-[0.6875rem] text-[var(--text-4)] sm:flex">
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">
              <CornerDownLeft size={10} />
            </kbd>
            abrir
          </span>
          <span className="ml-auto">{flat.length} resultado{flat.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
