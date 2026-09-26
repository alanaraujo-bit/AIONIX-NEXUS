"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { useToast } from "./Toast";

/* ------------------------------------------------------------------ envio */

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel,
  icon,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  icon?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? <Loader2 size={14} className="spin" /> : icon}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Barra fina de progresso no topo do formulário enquanto a action roda. */
export function FormPending() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
      <div className="h-full w-full origin-left bg-[var(--accent)]" style={{ animation: "nx-bar 1.1s infinite" }} />
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="anim-rise rounded-[var(--radius-sm)] border border-[color-mix(in_oklab,var(--bad)_28%,transparent)] bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] px-3 py-2 text-xs text-[var(--bad)]"
    >
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------ vazio */

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
      )}
    >
      <span className="relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-4)]">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-[0.8125rem] font-medium text-[var(--text-2)]">{title}</p>
        {description ? (
          <p className="mx-auto max-w-[34ch] text-xs leading-relaxed text-[var(--text-4)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- esqueleto */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function CardSkeleton() {
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-[10px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-4/5" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel divided overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 flex-1" style={{ maxWidth: `${40 + ((i * 13) % 35)}%` }} />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- copiar */

export function CopyButton({
  value,
  label = "Copiar",
  className = "btn btn-ghost btn-icon btn-sm",
  size = 13,
}: {
  value: string;
  label?: string;
  className?: string;
  size?: number;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          timer.current = setTimeout(() => setCopied(false), 1600);
        } catch {
          toast({ title: "Não foi possível copiar", tone: "error" });
        }
      }}
    >
      {copied ? <Check size={size} className="text-[var(--ok)]" /> : <Copy size={size} />}
    </button>
  );
}

/* ------------------------------------------------------------------ switch */

export function Switch({
  checked,
  onChange,
  label,
  description,
  name,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 select-none",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-[var(--text)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-3)]">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-[1.375rem] w-[2.375rem] flex-none rounded-full border transition-colors duration-200",
          checked
            ? "border-transparent bg-[var(--accent)]"
            : "border-[var(--line-strong)] bg-[var(--surface-3)]",
        )}
      >
        <span
          className="absolute top-1/2 h-[1rem] w-[1rem] -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ left: checked ? "calc(100% - 1.125rem)" : "0.125rem" }}
        />
      </button>
      {name ? <input type="hidden" name={name} value={checked ? "1" : "0"} /> : null}
    </label>
  );
}

/* --------------------------------------------------------------- segmentado */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode; title?: string }>;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-none items-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] p-0.5",
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            title={o.title ?? o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] font-medium whitespace-nowrap transition-all duration-150",
              size === "sm" ? "h-6 px-2 text-[0.6875rem]" : "h-7 px-2.5 text-xs",
              on
                ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]"
                : "text-[var(--text-3)] hover:text-[var(--text)]",
            )}
          >
            {o.icon}
            {o.label ? <span className={o.icon ? "hidden sm:inline" : undefined}>{o.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- tooltip */

export function Hint({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group/hint relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 hidden -translate-x-1/2 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[0.6875rem] whitespace-nowrap text-[var(--text-2)] shadow-[var(--shadow-pop)] group-hover/hint:block">
        {text}
      </span>
    </span>
  );
}
