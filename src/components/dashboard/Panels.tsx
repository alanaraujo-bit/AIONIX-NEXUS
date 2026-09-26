import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CircleCheck, ExternalLink, Pin, Sparkles } from "lucide-react";

import { EntityAvatar, Meter } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui/Bits";
import { STATUS_META, type Status } from "@/lib/domain";
import type { AgendaItem } from "@/lib/insights";
import type { ActivityWithProject } from "@/lib/queries";
import type { AttentionItem, Project, Tool } from "@/lib/types";
import { cn, formatDayShort, prettyUrl, relativeTime } from "@/lib/utils";

/* ------------------------------------------------------------- atenção -- */

const SEVERITY_COLOR = { 1: "var(--text-3)", 2: "var(--warn)", 3: "var(--bad)" } as const;

export function AttentionPanel({ items, now }: { items: AttentionItem[]; now: number }) {
  if (items.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<CircleCheck size={19} className="text-[var(--ok)]" />}
          title="Nada pedindo atenção"
          description="Todos os projetos têm próximo passo definido, links saudáveis e movimento recente."
          compact
        />
      </div>
    );
  }

  return (
    <ul className="panel divided overflow-hidden">
      {items.map(({ project: p, flags }) => {
        const worst = Math.max(...flags.map((f) => f.severity)) as 1 | 2 | 3;
        return (
          <li key={p.id}>
            <Link href={`/projetos/${p.slug}`} className="row flex items-start gap-3 p-3.5">
              <span className="relative">
                <EntityAvatar icon={p.icon} accent={p.color} size="sm" />
                <span
                  className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[var(--surface)]"
                  style={{ background: SEVERITY_COLOR[worst] }}
                >
                  <AlertTriangle size={7} className="text-white" strokeWidth={3} />
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-[0.8125rem] font-medium">{p.name}</span>
                  <span className="flex-none text-[0.625rem] text-[var(--text-4)]">
                    {STATUS_META[p.status].short}
                  </span>
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {flags.slice(0, 3).map((f) => (
                    <span
                      key={f.reason}
                      title={f.detail}
                      className="chip"
                      style={{
                        color: SEVERITY_COLOR[f.severity],
                        background: `color-mix(in oklab, ${SEVERITY_COLOR[f.severity]} 10%, transparent)`,
                        borderColor: `color-mix(in oklab, ${SEVERITY_COLOR[f.severity]} 22%, transparent)`,
                      }}
                    >
                      {f.label}
                    </span>
                  ))}
                  {flags.length > 3 ? <span className="chip chip-quiet">+{flags.length - 3}</span> : null}
                </span>
              </span>

              <span className="num flex-none pt-0.5 text-[0.6875rem] text-[var(--text-4)]">
                {relativeTime(p.last_activity_at, now)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- hoje -- */

const BUCKET_META = {
  overdue: { label: "Atrasado", color: "var(--bad)" },
  today: { label: "Hoje", color: "var(--warn)" },
  week: { label: "Esta semana", color: "var(--info)" },
  later: { label: "Depois", color: "var(--text-3)" },
  undated: { label: "Sem data", color: "var(--text-4)" },
} as const;

export function AgendaPanel({ items, limit = 6 }: { items: AgendaItem[]; limit?: number }) {
  const shown = items.slice(0, limit);
  if (shown.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<CalendarClock size={19} />}
          title="Agenda vazia"
          description="Defina próximos passos nos projetos para que eles apareçam aqui."
          compact
        />
      </div>
    );
  }

  return (
    <ul className="panel divided overflow-hidden">
      {shown.map((item) => {
        const meta = BUCKET_META[item.bucket];
        return (
          <li key={item.stepId}>
            <Link href={`/projetos/${item.project.slug}`} className="row flex items-center gap-3 px-3.5 py-3">
              <span
                className="flex h-8 w-8 flex-none flex-col items-center justify-center rounded-[8px] border text-[0.5625rem] leading-none font-semibold"
                style={{
                  color: meta.color,
                  background: `color-mix(in oklab, ${meta.color} 9%, transparent)`,
                  borderColor: `color-mix(in oklab, ${meta.color} 20%, transparent)`,
                }}
              >
                {item.due ? (
                  <>
                    <span className="text-[0.8125rem] tabular-nums">{formatDayShort(item.due).slice(0, 2)}</span>
                    <span className="mt-px opacity-70">{formatDayShort(item.due).slice(3, 5)}</span>
                  </>
                ) : (
                  <Icon name="CircleDashed" size={14} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium">{item.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-[var(--text-4)]">
                  <span
                    className="h-1 w-1 flex-none rounded-full"
                    style={{ background: `var(--c-${item.project.color})` }}
                  />
                  <span className="truncate">{item.project.name}</span>
                </span>
              </span>
              <span className="flex-none text-[0.625rem] font-medium" style={{ color: meta.color }}>
                {item.bucket === "overdue" && item.daysLeft !== null
                  ? `${Math.abs(item.daysLeft)} d`
                  : meta.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------------------------------------- portfólio -- */

export function PortfolioBar({ byStatus, total }: { byStatus: Record<Status, number>; total: number }) {
  const order: Status[] = ["active", "development", "paused", "idea", "completed"];
  const present = order.filter((s) => byStatus[s] > 0);

  if (total === 0) {
    return <p className="text-xs text-[var(--text-4)]">Nenhum projeto cadastrado ainda.</p>;
  }

  return (
    <div>
      <div className="flex h-2 w-full gap-[3px] overflow-hidden rounded-full">
        {present.map((s) => (
          <span
            key={s}
            className={`ac-${STATUS_META[s].accent} transition-all duration-500`}
            style={{ width: `${(byStatus[s] / total) * 100}%`, background: "var(--ac)", minWidth: "3px" }}
            title={`${STATUS_META[s].label}: ${byStatus[s]}`}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {order.map((s) => (
          <li key={s}>
            <Link
              href={`/projetos?status=${s}`}
              className={`ac-${STATUS_META[s].accent} group flex items-center gap-2`}
            >
              <span className="dot" />
              <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-[var(--text-3)] transition-colors group-hover:text-[var(--text)]">
                {STATUS_META[s].label}
              </span>
              <span className="num text-[0.75rem] font-semibold tabular-nums">{byStatus[s]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------- fixados -- */

export function PinnedPanel({ projects, now }: { projects: Project[]; now: number }) {
  if (projects.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<Pin size={18} />}
          title="Nenhum projeto fixado"
          description="Fixe os projetos que você abre todo dia para tê-los sempre aqui."
          compact
        />
      </div>
    );
  }
  return (
    <ul className="panel divided overflow-hidden">
      {projects.map((p) => (
        <li key={p.id}>
          <Link href={`/projetos/${p.slug}`} className="row flex items-center gap-3 px-3.5 py-3">
            <EntityAvatar icon={p.icon} accent={p.color} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium">{p.name}</span>
              <span className="mt-1 flex items-center gap-2">
                <Meter value={p.progress} accent={p.color} className="w-14" />
                <span className="num text-[0.625rem] text-[var(--text-4)]">{p.progress}%</span>
              </span>
            </span>
            <span className="num flex-none text-[0.625rem] text-[var(--text-4)]">
              {relativeTime(p.last_activity_at, now)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------- acesso rápido */

export function QuickTools({ tools }: { tools: Tool[] }) {
  if (tools.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<Sparkles size={18} />}
          title="Sem atalhos favoritos"
          description="Marque ferramentas como favoritas para vê-las aqui."
          action={
            <Link href="/atalhos" className="btn btn-subtle btn-sm">
              Gerenciar atalhos
            </Link>
          }
          compact
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
      {tools.map((t) => (
        <a
          key={t.id}
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            `ac-${t.color}`,
            "card-link group flex items-center gap-2.5 p-2.5",
          )}
        >
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border"
            style={{
              background: "color-mix(in oklab, var(--ac) 12%, transparent)",
              borderColor: "color-mix(in oklab, var(--ac) 22%, transparent)",
              color: "var(--ac)",
            }}
          >
            <Icon name={t.icon} size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.75rem] font-medium">{t.name}</span>
            <span className="block truncate text-[0.625rem] text-[var(--text-4)]">
              {t.subtitle ?? prettyUrl(t.url)}
            </span>
          </span>
          <ExternalLink
            size={11}
            className="flex-none text-[var(--text-4)] opacity-0 transition-opacity group-hover:opacity-100"
          />
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- atividade */

const ACTION_ICON: Record<string, string> = {
  create: "Plus",
  update: "PenTool",
  delete: "X",
  status: "Activity",
  link: "Link2",
  step: "CircleCheck",
  note: "NotebookPen",
  archive: "Archive",
  duplicate: "Boxes",
  check: "Radar",
};

export function ActivityFeed({
  entries,
  now,
  compact = false,
}: {
  entries: ActivityWithProject[];
  now: number;
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="panel">
        <EmptyState icon={<Icon name="Activity" size={18} />} title="Sem atividade ainda" compact />
      </div>
    );
  }

  return (
    <ol className="panel relative overflow-hidden">
      {entries.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 px-3.5 py-2.5">
          <span className="relative flex flex-none flex-col items-center">
            <span
              className={cn(
                "z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-3)]",
                e.projectColor && `ac-${e.projectColor}`,
              )}
              style={e.projectColor ? { color: "var(--ac)" } : undefined}
            >
              <Icon name={ACTION_ICON[e.action] ?? "CircleDashed"} size={11} />
            </span>
            {i < entries.length - 1 ? (
              <span className="absolute top-6 bottom-[-0.625rem] w-px bg-[var(--line-soft)]" />
            ) : null}
          </span>

          <span className="min-w-0 flex-1 pb-0.5">
            <span className="block text-[0.75rem] leading-snug text-[var(--text-2)]">
              {e.projectSlug ? (
                <Link href={`/projetos/${e.projectSlug}`} className="font-medium text-[var(--text)] hover:underline">
                  {e.projectName}
                </Link>
              ) : null}{" "}
              {e.title}
            </span>
            {!compact && e.detail ? (
              <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--text-4)]">{e.detail}</span>
            ) : null}
          </span>

          <span className="num flex-none pt-0.5 text-[0.625rem] whitespace-nowrap text-[var(--text-4)]">
            {relativeTime(e.created_at, now)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ cabeçalho */

export function PanelHeader({
  title,
  count,
  href,
  hrefLabel = "Ver tudo",
  icon,
}: {
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  icon?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      {icon ? <Icon name={icon} size={13} className="text-[var(--text-4)]" /> : null}
      <h2 className="h-section">{title}</h2>
      {count !== undefined && count > 0 ? (
        <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)]">
          {count}
        </span>
      ) : null}
      {href ? (
        <Link
          href={href}
          className="group ml-auto flex items-center gap-1 text-[0.6875rem] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--accent)]"
        >
          {hrefLabel}
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
