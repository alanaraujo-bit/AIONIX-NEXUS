import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, Phone, Plus } from "lucide-react";

import { EntityAvatar } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState } from "@/components/ui/Bits";
import { requireUser } from "@/lib/auth";
import { STATUS_META, type Status } from "@/lib/domain";
import { getClientBySlug, listProjects } from "@/lib/queries";
import { prettyUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = getClientBySlug(slug);
  return { title: client?.name ?? "Cliente" };
}

export default async function ClientePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const client = getClientBySlug(slug);
  if (!client) notFound();

  const now = Date.now();
  const projects = listProjects({ includeArchived: true }).filter((p) => p.client_id === client.id);
  const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Clientes", href: "/clientes" }, { label: client.name }]}
        title={client.name}
        description={client.company ?? undefined}
        actions={
          <Link href="/projetos/novo" className="btn btn-default">
            <Plus size={15} />
            Novo projeto
          </Link>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <EntityAvatar icon={client.icon} accent={client.color} size="sm" />
            {client.contact ? <span className="chip chip-quiet">{client.contact}</span> : null}
            {client.email ? (
              <a href={`mailto:${client.email}`} className="chip chip-outline gap-1.5 hover:text-[var(--accent)]">
                <Mail size={11} />
                {client.email}
              </a>
            ) : null}
            {client.phone ? (
              <a href={`tel:${client.phone}`} className="chip chip-outline gap-1.5 hover:text-[var(--accent)]">
                <Phone size={11} />
                {client.phone}
              </a>
            ) : null}
            {client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="chip chip-outline gap-1.5 hover:text-[var(--accent)]"
              >
                <ExternalLink size={11} />
                {prettyUrl(client.website)}
              </a>
            ) : null}
            {client.archived ? <span className="chip chip-quiet">Arquivado</span> : null}
          </div>
        }
      />

      {client.notes ? (
        <section className="panel p-4">
          <h2 className="h-section mb-2">Observações</h2>
          <p className="prose-note">{client.notes}</p>
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section className="flex flex-wrap gap-2">
          {(Object.keys(byStatus) as Status[]).map((s) => (
            <Link
              key={s}
              href={`/projetos?cliente=${client.slug}&status=${s}`}
              className={`ac-${STATUS_META[s].accent} chip chip-tone`}
            >
              <span className="dot" />
              {STATUS_META[s].label}
              <span className="num font-semibold">{byStatus[s]}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section>
        <h2 className="h-section mb-3">Projetos ({projects.length})</h2>
        {projects.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={<Plus size={19} />}
              title="Nenhum projeto para este cliente"
              description="Ao criar ou editar um projeto, selecione este cliente no campo correspondente."
              action={
                <Link href="/projetos/novo" className="btn btn-primary">
                  Criar projeto
                </Link>
              }
            />
          </div>
        ) : (
          <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} now={now} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
