import { AppShell } from "@/components/shell/AppShell";
import type { CommandAction } from "@/components/shell/CommandPalette";
import { logoutAction } from "@/lib/actions/auth";
import { ensureSeedUser, requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { attentionList } from "@/lib/insights";
import { listProjects } from "@/lib/queries";
import { buildSearchIndex, type SearchEntry } from "@/lib/search";

export const dynamic = "force-dynamic";

const ACTIONS: CommandAction[] = [
  {
    id: "act:new-project",
    title: "Novo projeto",
    subtitle: "Cadastrar um produto, sistema ou ideia",
    keywords: "criar adicionar novo projeto produto sistema ideia",
    icon: "Plus",
    href: "/projetos/novo",
  },
  {
    id: "act:focus",
    title: "Abrir Foco",
    subtitle: "O que precisa de você hoje",
    keywords: "foco hoje atencao prioridade agenda",
    icon: "Target",
    href: "/foco",
  },
  {
    id: "act:paused",
    title: "Projetos pausados",
    subtitle: "Filtrar por status pausado",
    keywords: "pausados parados status filtro",
    icon: "CircleDashed",
    href: "/projetos?status=paused",
  },
  {
    id: "act:active",
    title: "Projetos ativos",
    subtitle: "Filtrar por status ativo",
    keywords: "ativos producao rodando status filtro",
    icon: "Zap",
    href: "/projetos?status=active",
  },
  {
    id: "act:dev",
    title: "Em desenvolvimento",
    subtitle: "Filtrar por status em desenvolvimento",
    keywords: "desenvolvimento dev construindo status filtro",
    icon: "Hammer",
    href: "/projetos?status=development",
  },
  {
    id: "act:ideas",
    title: "Ideias e backlog",
    subtitle: "Filtrar por status ideia",
    keywords: "ideias backlog futuro status filtro",
    icon: "Sparkles",
    href: "/projetos?status=idea",
  },
  {
    id: "act:favorites",
    title: "Favoritos",
    subtitle: "Só os projetos marcados com estrela",
    keywords: "favoritos estrela marcados",
    icon: "Star",
    href: "/projetos?favoritos=1",
  },
  {
    id: "act:archived",
    title: "Arquivados",
    subtitle: "Projetos encerrados e guardados",
    keywords: "arquivados arquivo encerrados",
    icon: "Archive",
    href: "/projetos?arquivados=1",
  },
  {
    id: "act:links",
    title: "Saúde dos links",
    subtitle: "Verificar URLs quebradas",
    keywords: "links quebrados verificar saude monitorar url",
    icon: "Radar",
    href: "/links",
  },
  {
    id: "act:notes",
    title: "Notas rápidas",
    subtitle: "Bloco de notas do ecossistema",
    keywords: "notas anotacoes bloco rascunho",
    icon: "NotebookPen",
    href: "/notas",
  },
  {
    id: "act:new-client",
    title: "Novo cliente",
    subtitle: "Cadastrar um cliente",
    keywords: "cliente novo cadastrar empresa",
    icon: "Building2",
    href: "/config/clientes",
  },
  {
    id: "act:settings",
    title: "Configurações",
    subtitle: "Categorias, tags, clientes e ferramentas",
    keywords: "configuracoes ajustes admin preferencias",
    icon: "Settings2",
    href: "/config",
  },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureSeedUser();
  const user = await requireUser();

  const projects = await listProjects({ includeArchived: true });
  const visible = projects.filter((p) => !p.is_archived);
  const attention = attentionList(visible);
  const broken = visible.reduce((n, p) => n + p.brokenLinks, 0);

  const index = await buildSearchIndex();

  const recentRows = await all<{ slug: string }>(
    "SELECT slug FROM projects WHERE last_opened_at IS NOT NULL AND is_archived = 0 ORDER BY last_opened_at DESC LIMIT 5",
  );
  const bySlug = new Map(index.filter((e) => e.kind === "project").map((e) => [e.href, e] as const));
  const recent: SearchEntry[] = recentRows
    .map((r) => bySlug.get(`/projetos/${r.slug}`))
    .filter((e): e is SearchEntry => Boolean(e));

  const counts: Record<string, number> = {
    "/projetos": visible.length,
    "/foco": attention.length,
    "/links": broken,
  };

  return (
    <>
      <AppShell
        user={{ name: user.name, email: user.email }}
        index={index}
        actions={ACTIONS}
        recent={recent}
        counts={counts}
      >
        {children}
      </AppShell>
      <form id="nexus-logout" action={logoutAction} className="hidden" />
    </>
  );
}
