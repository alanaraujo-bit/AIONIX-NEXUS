import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Building2, ExternalLink, Pencil, UserRound } from "lucide-react";

import { EntityAvatar, Meter, StageTrack, TagPill } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { ActivityFeed } from "@/components/dashboard/Panels";
import { LinksPanel } from "@/components/project/LinksPanel";
import { ProgressControl, ProjectHeaderActions, ProjectQuickState } from "@/components/project/ProjectActions";
import { AssetsPanel, CredentialsPanel, NotesPanel } from "@/components/project/ResourcePanels";
import { StepsPanel } from "@/components/project/StepsPanel";
import { CopyButton } from "@/components/ui/Bits";
import { requireUser } from "@/lib/auth";
import { STAGE_META, STATUS_META } from "@/lib/domain";
import { attentionFlags, healthLabel, healthScore } from "@/lib/insights";
import { getProject, markProjectOpened } from "@/lib/queries";
import { formatDate, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  return { title: project?.name ?? "Projeto" };
}

const SEVERITY_COLOR = { 1: "var(--text-3)", 2: "var(--warn)", 3: "var(--bad)" } as const;

export default async function ProjetoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  markProjectOpened(project.id);

  const now = Date.now();
  const flags = attentionFlags(project, now);
  const health = healthScore(project, now);
  const healthMeta = healthLabel(health);
  const activity = project.activity.slice(0, 12).map((a) => ({
    ...a,
    projectName: project.name,
    projectSlug: project.slug,
    projectIcon: project.icon,
    projectColor: project.color as string,
  }));
  const primary = project.links.find((l) => l.is_primary) ?? project.links.find((l) => l.kind === "production");

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------- cabeçalho */}
      <header>
        <nav aria-label="Trilha" className="mb-3 flex items-center gap-1.5 text-xs text-[var(--text-4)]">
          <Link href="/projetos" className="link-quiet">
            Projetos
          </Link>
          <span>/</span>
          {project.category ? (
            <>
              <Link href={`/projetos?categoria=${project.category.slug}`} className="link-quiet">
                {project.category.name}
              </Link>
              <span>/</span>
            </>
          ) : null}
          <span className="truncate text-[var(--text-3)]">{project.name}</span>
        </nav>

        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
          <EntityAvatar icon={project.icon} accent={project.color} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="h-display">{project.name}</h1>
              {project.codename ? (
                <span className="mono text-[0.6875rem] text-[var(--text-4)]">{project.codename}</span>
              ) : null}
              {project.is_archived ? <span className="chip chip-quiet">Arquivado</span> : null}
            </div>
            {project.summary ? (
              <p className="mt-2 max-w-[70ch] text-[0.8125rem] leading-relaxed text-[var(--text-3)]">
                {project.summary}
              </p>
            ) : null}
            <div className="mt-3">
              <ProjectQuickState project={project} />
            </div>
          </div>

          <div className="flex flex-none items-center gap-1.5">
            {primary ? (
              <a href={primary.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Abrir</span>
              </a>
            ) : null}
            <Link href={`/projetos/${project.slug}/editar`} className="btn btn-default">
              <Pencil size={14} />
              <span className="hidden sm:inline">Editar</span>
            </Link>
            <ProjectHeaderActions project={project} />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ alertas */}
      {flags.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {flags.map((f) => (
            <li
              key={f.reason}
              className="flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5"
              style={{
                borderColor: `color-mix(in oklab, ${SEVERITY_COLOR[f.severity]} 26%, transparent)`,
                background: `color-mix(in oklab, ${SEVERITY_COLOR[f.severity]} 7%, transparent)`,
              }}
            >
              <AlertTriangle size={14} className="mt-px flex-none" style={{ color: SEVERITY_COLOR[f.severity] }} />
              <span className="min-w-0">
                <span className="block text-[0.75rem] font-medium" style={{ color: SEVERITY_COLOR[f.severity] }}>
                  {f.label}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-[var(--text-3)]">{f.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* -------------------------------------------------------------- corpo */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          {project.description ? (
            <section className="panel p-4 sm:p-5">
              <h2 className="h-section mb-2.5">Sobre</h2>
              <p className="prose-note">{project.description}</p>
            </section>
          ) : null}

          <StepsPanel projectId={project.id} steps={project.steps} />
          <LinksPanel projectId={project.id} links={project.links} />
          <NotesPanel projectId={project.id} notes={project.projectNotes} />

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <CredentialsPanel projectId={project.id} credentials={project.credentials} />
            <AssetsPanel projectId={project.id} assets={project.assets} />
          </div>
        </div>

        {/* ------------------------------------------------------- lateral */}
        <aside className="space-y-5 xl:col-span-4">
          <section className="panel space-y-4 p-4">
            <ProgressControl projectId={project.id} value={project.progress} />

            <div className="inset flex items-center gap-3 p-3">
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border text-[0.75rem] font-semibold"
                style={{
                  color: healthMeta.tone === "good" ? "var(--ok)" : healthMeta.tone === "warn" ? "var(--warn)" : "var(--bad)",
                  borderColor: `color-mix(in oklab, ${healthMeta.tone === "good" ? "var(--ok)" : healthMeta.tone === "warn" ? "var(--warn)" : "var(--bad)"} 35%, transparent)`,
                  background: `color-mix(in oklab, ${healthMeta.tone === "good" ? "var(--ok)" : healthMeta.tone === "warn" ? "var(--warn)" : "var(--bad)"} 10%, transparent)`,
                }}
              >
                {health}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-medium">{healthMeta.label}</span>
                <span className="block text-[0.6875rem] text-[var(--text-4)]">
                  {flags.length === 0 ? "Nenhum alerta ativo" : `${flags.length} ponto(s) de atenção`}
                </span>
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-[0.6875rem] text-[var(--text-3)]">Estágio</p>
              <div className="flex items-center gap-2.5">
                <StageTrack stage={project.stage} />
                <span className="text-[0.75rem] font-medium">{STAGE_META[project.stage].label}</span>
              </div>
            </div>
          </section>

          <section className="panel divided overflow-hidden">
            <Row label="Status" value={STATUS_META[project.status].label} />
            {project.category ? (
              <Row
                label="Categoria"
                value={
                  <Link href={`/projetos?categoria=${project.category.slug}`} className="link-quiet inline-flex items-center gap-1.5">
                    <Icon name={project.category.icon} size={12} />
                    {project.category.name}
                  </Link>
                }
              />
            ) : null}
            {project.client ? (
              <Row
                label="Cliente"
                value={
                  <Link href={`/clientes/${project.client.slug}`} className="link-quiet inline-flex items-center gap-1.5">
                    <Building2 size={12} />
                    {project.client.name}
                  </Link>
                }
              />
            ) : null}
            {project.owner ? (
              <Row
                label="Responsável"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={12} className="text-[var(--text-4)]" />
                    {project.owner}
                  </span>
                }
              />
            ) : null}
            {project.domain ? (
              <Row
                label="Domínio"
                value={
                  <span className="inline-flex items-center gap-1">
                    <span className="mono text-[0.6875rem]">{project.domain}</span>
                    <CopyButton value={project.domain} label="Copiar domínio" size={11} />
                  </span>
                }
              />
            ) : null}
            <Row label="Início" value={formatDate(project.started_at)} />
            {project.target_at ? <Row label="Meta" value={formatDate(project.target_at)} /> : null}
            {project.launched_at ? <Row label="Lançamento" value={formatDate(project.launched_at)} /> : null}
            <Row label="Última atividade" value={relativeTime(project.last_activity_at, now)} />
            <Row label="Criado" value={formatDate(project.created_at)} />
          </section>

          {project.tech.length > 0 ? (
            <section className="panel p-4">
              <h2 className="h-section mb-2.5">Tecnologias</h2>
              <div className="flex flex-wrap gap-1.5">
                {project.tech.map((t) => (
                  <span key={t} className="chip chip-outline">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {project.tags.length > 0 ? (
            <section className="panel p-4">
              <h2 className="h-section mb-2.5">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <Link key={t.id} href={`/projetos?tag=${t.slug}`}>
                    <TagPill name={t.name} accent={t.color} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-2.5 flex items-center gap-2">
              <h2 className="h-section">Histórico</h2>
              <Link
                href="/atividade"
                className="ml-auto flex items-center gap-1 text-[0.6875rem] text-[var(--text-3)] hover:text-[var(--accent)]"
              >
                Tudo
                <ArrowUpRight size={11} />
              </Link>
            </div>
            <ActivityFeed entries={activity} now={now} compact />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="flex-none text-[0.6875rem] text-[var(--text-4)]">{label}</span>
      <span className="min-w-0 truncate text-right text-[0.75rem] text-[var(--text-2)]">{value}</span>
    </div>
  );
}
