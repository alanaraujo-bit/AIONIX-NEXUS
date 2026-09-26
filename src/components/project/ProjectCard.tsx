import Link from "next/link";
import { ArrowUpRight, GitBranch, Link2, Pin, Star } from "lucide-react";

import { EntityAvatar, Meter, PriorityBars, StageTrack, StatusChip } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { PRIORITY_META, STAGE_META } from "@/lib/domain";
import { healthScore } from "@/lib/insights";
import type { Project } from "@/lib/types";
import { cn, prettyUrl, relativeTime } from "@/lib/utils";

/** Cartão de projeto — densidade alta, sem ruído. */
export function ProjectCard({ project: p, now }: { project: Project; now?: number }) {
  const health = healthScore(p, now);
  const flagged = p.brokenLinks > 0;

  return (
    <article className="card-link group relative flex flex-col p-4">
      <Link href={`/projetos/${p.slug}`} className="absolute inset-0 rounded-[var(--radius-lg)]" aria-label={p.name}>
        <span className="sr-only">Abrir {p.name}</span>
      </Link>

      <div className="flex items-start gap-3">
        <EntityAvatar icon={p.icon} accent={p.color} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="min-w-0 flex-1 truncate text-[0.875rem] leading-tight font-semibold tracking-[-0.015em]">
              {p.name}
            </h3>
            <span className="flex flex-none items-center gap-1 pt-px">
              {p.is_pinned ? <Pin size={12} className="text-[var(--accent)]" fill="currentColor" /> : null}
              {p.is_favorite ? <Star size={12} className="text-[var(--warn)]" fill="currentColor" /> : null}
            </span>
          </div>
          <p className="mt-1 truncate text-[0.6875rem] text-[var(--text-4)]">
            {[p.category?.name, p.client?.name].filter(Boolean).join(" · ") || "Sem categoria"}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.1rem] text-xs leading-relaxed text-[var(--text-3)]">
        {p.summary || "Sem descrição cadastrada."}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <StatusChip status={p.status} compact />
        <span className="chip chip-quiet" title={`Prioridade ${PRIORITY_META[p.priority].label.toLowerCase()}`}>
          <PriorityBars weight={PRIORITY_META[p.priority].weight} />
          {PRIORITY_META[p.priority].label}
        </span>
        <span className="ml-auto num text-[0.6875rem] font-semibold text-[var(--text-3)]">{p.progress}%</span>
      </div>

      <Meter value={p.progress} accent={p.color} className="mt-2" />

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[var(--line-soft)] pt-3 text-[0.6875rem] text-[var(--text-4)]">
        <span className="flex min-w-0 items-center gap-2.5">
          <StageTrack stage={p.stage} />
          <span className="truncate">{STAGE_META[p.stage].label}</span>
        </span>
        <span className="flex flex-none items-center gap-2.5">
          {p.linkCount > 0 ? (
            <span className={cn("flex items-center gap-1", flagged && "text-[var(--bad)]")} title={`${p.linkCount} links`}>
              <Link2 size={11} />
              {p.linkCount}
            </span>
          ) : null}
          <span
            className="flex items-center gap-1"
            title={`Saúde ${health}/100`}
            style={{ color: health >= 75 ? undefined : health >= 45 ? "var(--warn)" : "var(--bad)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: health >= 75 ? "var(--ok)" : health >= 45 ? "var(--warn)" : "var(--bad)" }}
            />
            {health}
          </span>
          <span className="tabular-nums">{relativeTime(p.last_activity_at, now)}</span>
        </span>
      </div>

      {p.nextStep ? (
        <p className="mt-2.5 flex items-start gap-1.5 text-[0.6875rem] leading-snug text-[var(--text-3)]">
          <ArrowUpRight size={11} className="mt-[3px] flex-none text-[var(--accent)]" />
          <span className="line-clamp-1">{p.nextStep.title}</span>
        </p>
      ) : (
        <p className="mt-2.5 flex items-center gap-1.5 text-[0.6875rem] text-[var(--text-4)] italic">
          <Icon name="CircleDashed" size={11} />
          Sem próximo passo
        </p>
      )}

      {p.primaryUrl ? (
        <a
          href={p.primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          /* fica acima da camada de link do cartão, então não precisa de handler */
          className="relative z-10 mt-2 inline-flex w-fit max-w-full items-center gap-1 truncate text-[0.6875rem] text-[var(--text-4)] transition-colors hover:text-[var(--accent)]"
        >
          <GitBranch size={10} className="flex-none rotate-90" />
          <span className="truncate">{prettyUrl(p.primaryUrl)}</span>
        </a>
      ) : null}
    </article>
  );
}
