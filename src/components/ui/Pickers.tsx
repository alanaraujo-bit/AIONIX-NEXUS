"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import { Icon } from "@/components/Icon";
import { ACCENTS, ACCENT_LABEL, ICON_CHOICES, type Accent } from "@/lib/domain";
import { cn, fold } from "@/lib/utils";

import { Modal } from "./Modal";

/* ------------------------------------------------------------------ ícone */

export function IconPicker({
  name,
  value,
  onChange,
  accent = "indigo",
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  accent?: Accent;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return ICON_CHOICES as readonly string[];
    return (ICON_CHOICES as readonly string[]).filter((i) => fold(i).includes(needle));
  }, [q]);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          `ac-${accent}`,
          "flex h-[2.25rem] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-inset)] px-2.5 text-[0.8125rem] transition-colors hover:border-[var(--text-4)]",
        )}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-[6px]"
          style={{ background: "color-mix(in oklab, var(--ac) 14%, transparent)", color: "var(--ac)" }}
        >
          <Icon name={value} size={14} />
        </span>
        <span className="text-[var(--text-2)]">{value}</span>
        <ChevronDown size={13} className="text-[var(--text-4)]" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Escolher ícone" size="lg">
        <div className="sticky top-0 z-10 -mx-5 mb-3 bg-[var(--surface)] px-5 pb-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-4)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ícone…"
              className="input pl-9"
              data-autofocus
            />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 md:grid-cols-10">
          {filtered.map((i) => (
            <button
              key={i}
              type="button"
              title={i}
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[var(--radius-sm)] border transition-all duration-120",
                i === value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-3)] hover:border-[var(--line)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]",
              )}
            >
              <Icon name={i} size={17} />
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-[var(--text-4)]">Nenhum ícone com “{q}”.</p>
        ) : null}
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------- cor/acento */

export function ColorPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Accent;
  onChange: (v: Accent) => void;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor">
        {ACCENTS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={a === value}
            title={ACCENT_LABEL[a]}
            onClick={() => onChange(a)}
            className={cn(
              `ac-${a}`,
              "relative h-7 w-7 rounded-[var(--radius-xs)] border transition-all duration-150",
              a === value ? "scale-110 border-[var(--text-3)]" : "border-[var(--line)] hover:scale-105",
            )}
            style={{ background: "color-mix(in oklab, var(--ac) 78%, transparent)" }}
          >
            {a === value ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-white shadow" />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- tokens */

export function TokenInput({
  name,
  defaultValue = "",
  placeholder,
  suggestions = [],
  prefix,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  suggestions?: string[];
  prefix?: string;
}) {
  const [tokens, setTokens] = useState<string[]>(
    defaultValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );
  const [draft, setDraft] = useState("");

  const available = suggestions.filter((s) => !tokens.some((t) => fold(t) === fold(s)));
  const hints = draft.trim()
    ? available.filter((s) => fold(s).includes(fold(draft.trim()))).slice(0, 6)
    : available.slice(0, 6);

  function add(value: string) {
    const v = value.trim().replace(/,+$/, "");
    if (!v || tokens.some((t) => fold(t) === fold(v))) {
      setDraft("");
      return;
    }
    setTokens([...tokens, v]);
    setDraft("");
  }

  return (
    <div>
      <input type="hidden" name={name} value={tokens.join(", ")} />
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-inset)] px-2 py-1.5 transition-colors focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        {tokens.map((t) => (
          <span key={t} className="chip chip-quiet gap-1">
            {prefix}
            {t}
            <button
              type="button"
              onClick={() => setTokens(tokens.filter((x) => x !== t))}
              aria-label={`Remover ${t}`}
              className="-mr-0.5 rounded p-0.5 text-[var(--text-4)] hover:text-[var(--bad)]"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
            if (e.key === "Backspace" && !draft && tokens.length) setTokens(tokens.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          placeholder={tokens.length === 0 ? placeholder : ""}
          className="min-w-[7rem] flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-[var(--text-4)]"
        />
      </div>
      {hints.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {hints.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="chip chip-outline transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              + {prefix}
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
