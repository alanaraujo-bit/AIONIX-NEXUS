import Link from "next/link";
import { Plus, Radar } from "lucide-react";

import {
  ActivityFeed,
  AgendaPanel,
  AttentionPanel,
  PanelHeader,
  PinnedPanel,
  PortfolioBar,
  QuickTools,
} from "@/components/dashboard/Panels";
import { StatTile } from "@/components/dashboard/StatTile";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState } from "@/components/ui/Bits";
import { requireUser } from "@/lib/auth";
import { setting } from "@/lib/db";
import { agenda, attentionList, portfolioStats } from "@/lib/insights";
import { listActivity, listCategories, listClients, listProjects, listTools } from "@/lib/queries";
import { daysSince } from "@/lib/utils";

export const metadata = { title: "Cockpit" };
export const dynamic = "force-dynamic";

function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function CockpitPage() {
  const user = await requireUser();
  const now = Date.now();
  const today = new Date();

  const allProjects = await listProjects({ includeArchived: true });
  const projects = allProjects.filter((p) => !p.is_archived);
  const archivedCount = allProjects.length - projects.length;

  const clients = await listClients();
  const categories = await listCategories();
  const stats = portfolioStats(projects, {
    clients: clients.length,
    categories: categories.length,
    archived: archivedCount,
  }, now);

  const attention = attentionList(projects, now);
  const agendaItems = agenda(projects, now);
  const pinned = projects.filter((p) => p.is_pinned);
  const favorites = projects.filter((p) => p.is_favorite && !p.is_pinned);
  const recentlyUpdated = [...projects]
    .sort((a, b) => (daysSince(a.last_activity_at, now) ?? 999) - (daysSince(b.last_activity_at, now) ?? 999))
    .slice(0, 6);
  const activity = await listActivity(9);
  const favoriteTools = (await listTools()).filter((t) => t.favorite).slice(0, 9);
  const ownerName = await setting("owner_name", user.name);

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  const empty = allProjects.length === 0;

  return (
    <div className="space-y-7">
      {/* -------------------------------------------------------- saudação */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="h-section mb-1.5">
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
          </p>
          <h1 className="h-display">
            {greeting(today)}, <span className="text-[var(--accent)]">{ownerName.split(" ")[0]}</span>.
          </h1>
          <p className="mt-2 text-[0.8125rem] text-[var(--text-3)]">
            {empty
              ? "O NEXUS está pronto. Cadastre o primeiro projeto para começar a enxergar o ecossistema."
              : attention.length === 0
                ? `${stats.total} projetos sob controle — nada exigindo atenção agora.`
                : `${attention.length} ${attention.length === 1 ? "projeto pede" : "projetos pedem"} sua atenção · ${stats.updatedThisWeek} com movimento nos últimos 7 dias.`}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Link href="/links" className="btn btn-default">
            <Radar size={15} />
            <span className="hidden sm:inline">Verificar links</span>
          </Link>
          <Link href="/projetos/novo" className="btn btn-primary">
            <Plus size={15} />
            Novo projeto
          </Link>
        </div>
      </header>

      {empty ? (
        <div className="panel">
          <EmptyState
            icon={<Plus size={20} />}
            title="Seu ecossistema ainda está vazio"
            description="Cadastre produtos, SaaS, sistemas internos e ideias. Cada projeto guarda links, ambientes, próximos passos e notas num só lugar."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/projetos/novo" className="btn btn-primary">
                  <Plus size={15} />
                  Criar primeiro projeto
                </Link>
                <Link href="/config/dados" className="btn btn-default">
                  Carregar dados de exemplo
                </Link>
              </div>
            }
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------------ KPIs */}
      {!empty ? (
        <section aria-label="Panorama" className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="stagger grid min-w-max grid-flow-col auto-cols-[8.75rem] gap-2.5 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <StatTile
              label="Ativos"
              value={stats.byStatus.active}
              icon="Zap"
              accent="emerald"
              href="/projetos?status=active"
              hint="em produção"
            />
            <StatTile
              label="Em desenvolvimento"
              value={stats.byStatus.development}
              icon="Hammer"
              accent="blue"
              href="/projetos?status=development"
              hint={`${stats.avgProgressActive}% médio`}
            />
            <StatTile
              label="Pausados"
              value={stats.byStatus.paused}
              icon="CircleDashed"
              accent="amber"
              href="/projetos?status=paused"
            />
            <StatTile
              label="Concluídos"
              value={stats.byStatus.completed}
              icon="Trophy"
              accent="violet"
              href="/projetos?status=completed"
            />
            <StatTile
              label="Ideias"
              value={stats.byStatus.idea}
              icon="Sparkles"
              accent="slate"
              href="/projetos?status=idea"
              hint="backlog"
            />
            <StatTile
              label="Precisam de atenção"
              value={attention.length}
              icon="Radar"
              accent={attention.length > 0 ? "rose" : "slate"}
              href="/foco"
              emphasis
              hint={stats.brokenLinks > 0 ? `${stats.brokenLinks} link(s) fora do ar` : undefined}
            />
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- corpo */}
      {!empty ? (
        <div className="grid gap-6 xl:grid-cols-12 xl:gap-7">
          <div className="space-y-7 xl:col-span-8">
            <section>
              <PanelHeader
                title="Precisa de atenção"
                count={attention.length}
                href={attention.length > 0 ? "/foco" : undefined}
                icon="Radar"
              />
              <AttentionPanel items={attention.slice(0, 5)} now={now} />
            </section>

            <section>
              <PanelHeader title="Visão do portfólio" icon="ChartPie" href="/projetos" hrefLabel="Abrir projetos" />
              <div className="panel p-4">
                <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <Figure value={stats.total} label="projetos ativos no NEXUS" />
                  <Figure value={stats.totalLinks} label="links catalogados" />
                  <Figure value={stats.clients} label="clientes" />
                  <Figure value={stats.openSteps} label="próximos passos abertos" />
                  <Figure
                    value={`${stats.momentum}%`}
                    label="com movimento na semana"
                    tone={stats.momentum >= 50 ? "ok" : stats.momentum >= 25 ? "warn" : "bad"}
                  />
                </div>
                <PortfolioBar byStatus={stats.byStatus} total={stats.total} />
              </div>
            </section>

            <section>
              <PanelHeader
                title="Atualizados recentemente"
                href="/projetos?ordem=recentes"
                icon="Activity"
              />
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {recentlyUpdated.map((p) => (
                  <ProjectCard key={p.id} project={p} now={now} />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-7 xl:col-span-4">
            <section>
              <PanelHeader title="Hoje" count={agendaItems.length} href="/foco" icon="CalendarClock" />
              <AgendaPanel items={agendaItems} limit={6} />
            </section>

            <section>
              <PanelHeader title="Fixados" count={pinned.length} icon="Pin" />
              <PinnedPanel projects={pinned.length > 0 ? pinned : favorites.slice(0, 4)} now={now} />
            </section>

            <section>
              <PanelHeader title="Acesso rápido" href="/atalhos" icon="Zap" />
              <QuickTools tools={favoriteTools} />
            </section>

            <section>
              <PanelHeader title="Atividade recente" href="/atividade" icon="Activity" />
              <ActivityFeed entries={activity} now={now} compact />
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Figure({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : undefined;
  return (
    <div className="min-w-0">
      <p className="num text-[1.25rem] leading-none font-semibold tracking-[-0.03em]" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[0.6875rem] text-[var(--text-4)]">{label}</p>
    </div>
  );
}
