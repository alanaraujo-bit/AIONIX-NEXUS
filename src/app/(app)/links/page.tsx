import Link from "next/link";
import { CircleCheck, ExternalLink, Radar } from "lucide-react";

import { EntityAvatar } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { CopyButton, EmptyState } from "@/components/ui/Bits";
import { checkAllLinksAction, checkSingleLinkAction } from "@/lib/actions/links";
import { requireUser } from "@/lib/auth";
import { LINK_KIND_META, asAccent } from "@/lib/domain";
import { listAllLinks } from "@/lib/queries";
import { prettyUrl, relativeTime } from "@/lib/utils";

export const metadata = { title: "Saúde dos links" };
export const dynamic = "force-dynamic";

export default async function LinksPage() {
  await requireUser();
  const now = Date.now();
  const links = listAllLinks();
  const monitored = links.filter((l) => l.monitor);
  const checked = monitored.filter((l) => l.last_status !== null);
  const broken = checked.filter((l) => l.last_status === 0 || (l.last_status ?? 0) >= 400);
  const healthy = checked.filter((l) => (l.last_status ?? 0) > 0 && (l.last_status ?? 0) < 400);
  const never = monitored.filter((l) => l.last_status === null);

  const ordered = [...broken, ...never, ...healthy];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saúde dos links"
        eyebrow="Monitoramento"
        description="Uma verificação HTTP em todos os endereços marcados como monitorados. Repositórios e painéis que exigem login ficam de fora por padrão."
        actions={
          <ActionForm action={checkAllLinksAction} fields={{}}>
            <ActionButton className="btn btn-primary" spinnerSize={14}>
              <Radar size={15} />
              Verificar agora
            </ActionButton>
          </ActionForm>
        }
      />

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Monitorados" value={monitored.length} color="var(--info)" />
        <Stat label="Respondendo" value={healthy.length} color="var(--ok)" />
        <Stat label="Com falha" value={broken.length} color="var(--bad)" />
        <Stat label="Nunca verificados" value={never.length} color="var(--text-3)" />
      </section>

      {monitored.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Radar size={19} />}
            title="Nenhum link monitorado"
            description="Marque a opção “monitorar” nos links de produção e staging dos seus projetos."
            action={
              <Link href="/projetos" className="btn btn-default">
                Abrir projetos
              </Link>
            }
          />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divided">
            {ordered.map((l) => {
              const failed = l.last_status !== null && (l.last_status === 0 || l.last_status >= 400);
              const untested = l.last_status === null;
              const meta = LINK_KIND_META[l.kind];
              const color = untested ? "var(--text-4)" : failed ? "var(--bad)" : "var(--ok)";
              return (
                <li key={l.id} className="row group flex items-center gap-3 px-3.5 py-3">
                  <span className="h-6 w-1 flex-none rounded-full" style={{ background: color }} />
                  <EntityAvatar icon={l.projectIcon} accent={asAccent(l.projectColor, "indigo")} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <Link href={`/projetos/${l.projectSlug}`} className="truncate text-[0.8125rem] font-medium hover:underline">
                        {l.projectName}
                      </Link>
                      <span className="flex items-center gap-1 text-[0.6875rem] text-[var(--text-4)]">
                        <Icon name={meta.icon} size={10} />
                        {l.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--text-4)]">
                      {prettyUrl(l.url)}
                    </span>
                  </span>

                  <span className="hidden flex-none text-right sm:block">
                    <span className="num block text-[0.75rem] font-medium" style={{ color }}>
                      {untested ? "—" : failed ? (l.last_error ?? `HTTP ${l.last_status}`) : l.last_status}
                    </span>
                    <span className="num block text-[0.625rem] text-[var(--text-4)]">
                      {l.last_checked_at ? relativeTime(l.last_checked_at, now) : "nunca verificado"}
                    </span>
                  </span>

                  <span className="flex flex-none items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                    <CopyButton value={l.url} label="Copiar URL" />
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Abrir">
                      <ExternalLink size={13} />
                    </a>
                    <ActionForm action={checkSingleLinkAction} fields={{ id: l.id }}>
                      <ActionButton className="btn btn-ghost btn-icon btn-sm" title="Verificar este link">
                        <Radar size={13} />
                      </ActionButton>
                    </ActionForm>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {broken.length === 0 && checked.length > 0 ? (
        <p className="flex items-center justify-center gap-2 text-xs text-[var(--ok)]">
          <CircleCheck size={13} />
          Todos os links verificados responderam.
        </p>
      ) : null}

      {links.length > monitored.length ? (
        <p className="text-center text-[0.6875rem] text-[var(--text-4)]">
          {links.length - monitored.length} link(s) fora do monitoramento (repositórios, painéis com login).
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="panel p-3.5">
      <p className="num text-[1.375rem] leading-none font-semibold tracking-[-0.03em]" style={{ color }}>
        {value}
      </p>
      <p className="mt-1.5 text-[0.6875rem] text-[var(--text-3)]">{label}</p>
    </div>
  );
}
