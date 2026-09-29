import { Database, Download, Sparkles, TriangleAlert } from "lucide-react";

import { DangerZone } from "@/components/config/DangerZone";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { clearDemoAction, seedDemoAction } from "@/lib/actions/seed";
import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { demoIsLoaded } from "@/lib/seed-run";
import { run, uid } from "@/lib/db";

export const metadata = { title: "Dados" };
export const dynamic = "force-dynamic";

const TABLES: Array<[string, string]> = [
  ["projects", "Projetos"],
  ["project_links", "Links"],
  ["project_steps", "Próximos passos"],
  ["project_credentials", "Referências de credencial"],
  ["project_assets", "Arquivos e referências"],
  ["notes", "Notas"],
  ["clients", "Clientes"],
  ["categories", "Categorias"],
  ["tags", "Tags"],
  ["tools", "Atalhos"],
  ["activity", "Registros de atividade"],
];

export default async function DadosPage() {
  await requireUser();

  const counts = await Promise.all(
    TABLES.map(async ([table, label]) => ({
      label,
      n: (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n ?? 0,
    })),
  );

  const demo = await demoIsLoaded({ get, run, uid });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-4 sm:p-5">
        <h2 className="h-section mb-1 flex items-center gap-2">
          <Database size={13} />
          O que está guardado
        </h2>
        <p className="mb-4 text-[0.6875rem] text-[var(--text-4)]">
          Tudo vive num único arquivo SQLite. Fazer backup é copiar esse arquivo.
        </p>
        <ul className="divided">
          {counts.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-4 py-2">
              <span className="text-[0.8125rem] text-[var(--text-2)]">{c.label}</span>
              <span className="num text-[0.8125rem] font-semibold tabular-nums">{c.n}</span>
            </li>
          ))}
        </ul>

        <a href="/api/export" download className="btn btn-default btn-block mt-4">
          <Download size={14} />
          Exportar tudo em JSON
        </a>
      </section>

      <div className="space-y-5">
        <section className="panel p-4 sm:p-5">
          <h2 className="h-section mb-1 flex items-center gap-2">
            <Sparkles size={13} />
            Portfólio de demonstração
          </h2>
          <p className="mb-4 text-[0.6875rem] leading-relaxed text-[var(--text-4)]">
            Dez projetos fictícios com links, próximos passos, notas e clientes — útil para ver o NEXUS cheio antes de
            cadastrar o seu. Remover apaga só o que veio do exemplo; o que você criou fica.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionForm action={seedDemoAction} fields={{}}>
              <ActionButton className="btn btn-default btn-sm" spinnerSize={13}>
                {demo ? "Recarregar exemplos faltantes" : "Carregar dados de exemplo"}
              </ActionButton>
            </ActionForm>
            {demo ? (
              <ActionForm action={clearDemoAction} fields={{}}>
                <ActionButton className="btn btn-ghost btn-sm text-[var(--bad)]" spinnerSize={13}>
                  Remover dados de exemplo
                </ActionButton>
              </ActionForm>
            ) : null}
          </div>
        </section>

        <section className="panel border-[color-mix(in_oklab,var(--bad)_25%,var(--line))] p-4 sm:p-5">
          <h2 className="h-section mb-1 flex items-center gap-2 text-[var(--bad)]">
            <TriangleAlert size={13} />
            Zona de risco
          </h2>
          <p className="mb-4 text-[0.6875rem] leading-relaxed text-[var(--text-4)]">
            Apaga projetos, links, passos, notas, clientes, tags e histórico. Categorias, atalhos e sua conta
            permanecem. Exporte antes.
          </p>
          <DangerZone />
        </section>
      </div>
    </div>
  );
}
