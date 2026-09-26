import { STAGE_META, STATUS_META, type Accent, type Stage, type Status } from "@/lib/domain";
import { cn } from "@/lib/utils";

import { Icon } from "./Icon";

export const accentClass = (a: Accent | string) => `ac-${a}`;

export function StatusChip({ status, compact = false }: { status: Status; compact?: boolean }) {
  const meta = STATUS_META[status];
  const live = status === "active";
  return (
    <span className={cn("chip chip-tone", accentClass(meta.accent))} title={meta.hint}>
      <span className={cn("dot relative", live && "dot-pulse")} />
      {compact ? meta.short : meta.label}
    </span>
  );
}

/** Três barrinhas crescentes — lê-se mais rápido que texto numa lista densa. */
export function PriorityBars({ weight }: { weight: number }) {
  return (
    <span className="flex h-2.5 items-end gap-[2px]" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] rounded-[1px] bg-current"
          style={{ height: `${3 + i * 2.5}px`, opacity: weight >= i + 1 ? 1 : 0.28 }}
        />
      ))}
    </span>
  );
}

/** Trilha de estágio: 6 traços, preenchidos até o atual. */
export function StageTrack({ stage, className }: { stage: Stage; className?: string }) {
  const step = STAGE_META[stage].step;
  return (
    <span className={cn("flex items-center gap-[3px]", className)} title={`Estágio: ${STAGE_META[stage].label}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[3px] w-3 rounded-full transition-colors",
            i < step ? "bg-[var(--accent)]" : "bg-[color-mix(in_oklab,var(--text-4)_28%,transparent)]",
          )}
        />
      ))}
    </span>
  );
}

export function Meter({ value, accent = "indigo", className }: { value: number; accent?: Accent; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cn("meter block", accentClass(accent), className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

interface AvatarProps {
  icon: string;
  accent: Accent;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const AV_SIZE = {
  xs: { box: "h-6 w-6 rounded-[6px]", icon: 13 },
  sm: { box: "h-8 w-8 rounded-[8px]", icon: 15 },
  md: { box: "h-10 w-10 rounded-[10px]", icon: 18 },
  lg: { box: "h-14 w-14 rounded-[14px]", icon: 24 },
};

/** Marca visual de um projeto/cliente: ícone sobre vidro tingido pelo acento. */
export function EntityAvatar({ icon, accent, size = "md", className }: AvatarProps) {
  const s = AV_SIZE[size];
  return (
    <span
      className={cn(
        "relative flex flex-none items-center justify-center border",
        accentClass(accent),
        s.box,
        className,
      )}
      style={{
        background: "color-mix(in oklab, var(--ac) 12%, var(--surface))",
        borderColor: "color-mix(in oklab, var(--ac) 26%, transparent)",
        color: "var(--ac)",
      }}
    >
      <Icon name={icon} size={s.icon} strokeWidth={1.9} />
    </span>
  );
}

export function TagPill({ name, accent }: { name: string; accent: Accent }) {
  return (
    <span className={cn("chip chip-tone", accentClass(accent))}>
      <span className="opacity-60">#</span>
      {name}
    </span>
  );
}
