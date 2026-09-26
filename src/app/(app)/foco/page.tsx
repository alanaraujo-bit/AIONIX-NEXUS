import Link from "next/link";
import { AlertTriangle, CalendarClock, CircleCheck, Clock3, Radar } from "lucide-react";

import { EntityAvatar, Meter, PriorityBars, StatusChip } from "@/components/Badges";
import { AgendaPanel, PanelHeader } from "@/components/dashboard/Panels";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/Bits";
import { ActionForm, ActionButton } from "@/components/ui/ActionForm";
import { checkAllLinksAction } from "@/lib/actions/links";
import { requireUser } from "@/lib/auth";
import { PRIORITY_META } from "@/lib/domain";
import { STALE_DAYS, agenda, attentionList, healthScore } from "@/lib/insights";
import { listProjects } from "@/lib/queries";
import { daysSince, relativeTime } from "@/lib/utils";

export const metadata = { title: "Foco" };
export const dynamic = "force-dynamic";

const SEVERITY_COLOR = { 1: "var(--text-3)", 2: "var(--warn)", 3: "var(--bad)" } as const;

export default async function FocoPage() {
  await requireUser();
  const now = Date.now();

  const projects = listProjects().filter((p) => !p.is_archived);
  const attention = attentionList(projects, now);
  const agendaItems = agenda(projects, now);
  const overdue = agendaItems.filter((i) => i.bucket === "overdue");
  const thisWeek = agendaItems.filter((i) => i.bucket === "today" || i.bucket === "week");

  const forgotten = projects
    .filter((p) => {
      const idle = daysSince(p.last_activity_at, now) ?? 0;
      return p.status !== "completed" && idle > STALE_DAYS[p.status];
    })
    .sort((a, b) => (daysSince(b.last_activity_at, now) ?? 0) - (daysSince(a.last_activity_at, now) ?? 0));

  const noNextStep = projects.filter((p) => p.openSteps === 0 && p.status !== "completed" && p.status !== "idea");
  const brokenLinks = projects.reduce((n, p) => n + p.brokenLinks, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Foco"
        eyebrow="O que precisa de você"
        description="Uma leitura só do que está atrasado, parado ou sem direção. O resto pode esperar."
        actions={
          <ActionForm action={checkAllLinksAction} fields={{}}>
            <ActionButton className="btn btn-default" spinnerSize={14}>
              <Radar size={14} />
              Verificar todos os links
            </ActionButton>
          </ActionForm>
        }
      />

      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Passos atrasados" value={overdue.length} tone={overdue.length ? "bad" : "ok"} icon={<Clock3 size={14} />} />
        <Tile label="Vencem esta semana" value={thisWeek.length} tone="info" icon={<CalendarClock size={14} />} />
        <Tile label="Sem próximo passo" value={noNextStep.length} tone={noNextStep.length ? "warn" : "ok"} icon={<CircleCheck size={14} />} />
        <Tile label="Links fora do ar" value={brokenLinks} tone={brokenLinks ? "bad" : "ok"} icon={<Radar size={14} />} />
      </section>

      <div className="grid gap-7 xl:grid-cols-12">
        <div className="space-y-7 xl:col-span-7">
          <section>
            <PanelHeader title="Precisa de atenção" count={attention.length} icon="Radar" />
            {attention.length === 0 ? (
              <div className="panel">
                <EmptyState
                  icon={<CircleCheck size={19} className="text-[var(--ok)]" />}
                  title="Portfólio limpo"
                  description="Nenhum projeto atrasado, esquecido ou sem direção. Bom momento para avançar no que dá retorno."
                />
              </div>
            ) : (
              <ul className="space-y-2.5">
                {attention.map(({ project: p, flags, score }) => {
                  const worst = Math.max(...flags.map((f) => f.severity)) as 1 | 2 | 3;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projetos/${p.slug}`}
                        className="card-link block p-4"
                        style={{ borderLeft: `2px solid ${SEVERITY_COLOR[worst]}` }}
                      >
                        <div className="flex items-start gap-3">
                          <EntityAvatar icon={p.icon} accent={p.color} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[0.875rem] font-semibold">{p.name}</span>
                              <StatusChip status={p.status} compact />
                              <span className="flex items-center gap-1 text-[0.625rem] text-[var(--text-4)]">
                                <PriorityBars weight={PRIORITY_META[p.priority].weight} />
                                {PRIORITY_META[p.priority].label}
                              </span>
                              <span className="num ml-auto flex-none text-[0.625rem] text-[var(--text-4)]">
                                {relativeTime(p.last_activity_at, now)}
                              </span>
                            </div>

                            <ul className="mt-2.5 space-y-1.5">
                              {flags.map((f) => (
                                <li key={f.reason} className="flex items-start gap-2 text-[0.75rem]">
                                  <AlertTriangle
                                    size={12}
                                    className="mt-0.5 flex-none"
                                    style={{ color: SEVERITY_COLOR[f.severity] }}
                                  />
                                  <span className="min-w-0">
                                    <span className="font-medium" style={{ color: SEVERITY_COLOR[f.severity] }}>
                                      {f.label}
                                    </span>
                                    <span className="text-[var(--text-4)]"> — {f.detail}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>

                            <div className="mt-3 flex items-center gap-2">
                              <Meter value={p.progress} accent={p.color} className="flex-1" />
                              <span className="num text-[0.625rem] text-[var(--text-4)]">{p.progress}%</span>
                              <span className="num text-[0.625rem] text-[var(--text-4)]">
                                · saúde {healthScore(p, now)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-7 xl:col-span-5">
          <section>
            <PanelHeader title="Agenda" count={agendaItems.length} icon="CalendarClock" />
            <AgendaPanel items={agendaItems} limit={12} />
          </section>

          <section>
            <PanelHeader title="Esquecidos" count={forgotten.length} icon="Clock3" />
            {forgotten.length === 0 ? (
              <div className="panel">
                <EmptyState icon={<Clock3 size={18} />} title="Tudo com movimento recente" compact />
              </div>
            ) : (
              <ul className="panel divided overflow-hidden">
                {forgotten.slice(0, 8).map((p) => {
                  const idle = daysSince(p.last_activity_at, now) ?? 0;
                  return (
                    <li key={p.id}>
                      <Link href={`/projetos/${p.slug}`} className="row flex items-center gap-3 px-3.5 py-2.5">
                        <EntityAvatar icon={p.icon} accent={p.color} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-medium">{p.name}</span>
                          <span className="block text-[0.6875rem] text-[var(--text-4)]">
                            limite de {STALE_DAYS[p.status]} d para este status
                          </span>
                        </span>
                        <span className="num flex-none text-[0.75rem] font-semibold text-[var(--warn)]">{idle} d</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad" | "info";
  icon: React.ReactNode;
}) {
  const color =
    tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--info)";
  return (
    <div className="panel flex items-center gap-3 p-3.5">
      <span
        className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border"
        style={{
          color,
          background: `color-mix(in oklab, ${color} 10%, transparent)`,
          borderColor: `color-mix(in oklab, ${color} 22%, transparent)`,
        }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="num block text-[1.375rem] leading-none font-semibold tracking-[-0.03em]">{value}</span>
        <span className="mt-1 block truncate text-[0.6875rem] text-[var(--text-3)]">{label}</span>
      </span>
    </div>
  );
}
