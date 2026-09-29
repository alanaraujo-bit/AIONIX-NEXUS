import { ActivityFeed } from "@/components/dashboard/Panels";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { clearActivityAction } from "@/lib/actions/catalog";
import { requireUser } from "@/lib/auth";
import { countActivity, listActivity } from "@/lib/queries";
import { Eraser } from "lucide-react";

export const metadata = { title: "Atividade" };
export const dynamic = "force-dynamic";

const PAGE = 60;

export default async function AtividadePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  await requireUser();
  const { p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const total = await countActivity();
  const entries = await listActivity(PAGE, (page - 1) * PAGE);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div>
      <PageHeader
        title="Atividade"
        eyebrow="Histórico"
        description={`${total} registro${total === 1 ? "" : "s"}. Tudo que mudou no ecossistema, do mais recente ao mais antigo.`}
        actions={
          total > 0 ? (
            <ActionForm action={clearActivityAction} fields={{}}>
              <ActionButton className="btn btn-ghost" spinnerSize={14}>
                <Eraser size={14} />
                Limpar histórico
              </ActionButton>
            </ActionForm>
          ) : null
        }
      />

      <ActivityFeed entries={entries} now={Date.now()} />

      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-2 text-xs">
          <a
            href={`/atividade?p=${page - 1}`}
            aria-disabled={page <= 1}
            className={`btn btn-subtle btn-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Anterior
          </a>
          <span className="num px-2 text-[var(--text-4)]">
            {page} de {pages}
          </span>
          <a
            href={`/atividade?p=${page + 1}`}
            aria-disabled={page >= pages}
            className={`btn btn-subtle btn-sm ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
          >
            Próxima
          </a>
        </nav>
      ) : null}
    </div>
  );
}
