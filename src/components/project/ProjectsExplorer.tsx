"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowDownUp,
  Check,
  Columns3,
  LayoutGrid,
  List,
  Pin,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import { EntityAvatar, Meter, PriorityBars, StageTrack, StatusChip } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { EmptyState, Segmented } from "@/components/ui/Bits";
import { Menu } from "@/components/ui/Menu";
import {
  KANBAN_STATUS_ORDER,
  PRIORITIES,
  PRIORITY_META,
  STAGES,
  STAGE_META,
  STATUSES,
  STATUS_META,
  type Priority,
  type Stage,
  type Status,
} from "@/lib/domain";
import { healthScore } from "@/lib/insights";
import type { Category, Client, Project, Tag } from "@/lib/types";
import { cn, fuzzyScore, relativeTime } from "@/lib/utils";

import { ProjectCard } from "./ProjectCard";

type View = "cards" | "lista" | "quadro";
type GroupBy = "status" | "prioridade" | "categoria" | "cliente" | "estagio";
type SortBy = "recentes" | "nome" | "prioridade" | "progresso" | "criacao";

interface Props {
  projects: Project[];
  categories: Category[];
  clients: Client[];
  tags: Tag[];
  now: number;
}

const SORT_LABEL: Record<SortBy, string> = {
  recentes: "Atividade recente",
  nome: "Nome (A–Z)",
  prioridade: "Prioridade",
  progresso: "Progresso",
  criacao: "Mais novos",
};

const GROUP_LABEL: Record<GroupBy, string> = {
  status: "Status",
  prioridade: "Prioridade",
  categoria: "Categoria",
  cliente: "Cliente",
  estagio: "Estágio",
};

export function ProjectsExplorer({ projects, categories, clients, tags, now }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [view, setView] = useState<View>((params.get("vista") as View) ?? "cards");
  const [groupBy, setGroupBy] = useState<GroupBy>((params.get("agrupar") as GroupBy) ?? "status");
  const [sortBy, setSortBy] = useState<SortBy>((params.get("ordem") as SortBy) ?? "recentes");
  const [status, setStatus] = useState<Status[]>(splitParam(params.get("status")) as Status[]);
  const [priority, setPriority] = useState<Priority[]>(splitParam(params.get("prioridade")) as Priority[]);
  const [stage, setStage] = useState<Stage[]>(splitParam(params.get("estagio")) as Stage[]);
  const [category, setCategory] = useState<string[]>(splitParam(params.get("categoria")));
  const [client, setClient] = useState<string[]>(splitParam(params.get("cliente")));
  const [tag, setTag] = useState<string[]>(splitParam(params.get("tag")));
  const [onlyFav, setOnlyFav] = useState(params.get("favoritos") === "1");
  const [showArchived, setShowArchived] = useState(params.get("arquivados") === "1");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Mantém a URL em sincronia — links e voltar do navegador funcionam.
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (view !== "cards") p.set("vista", view);
    if (view === "quadro" && groupBy !== "status") p.set("agrupar", groupBy);
    if (sortBy !== "recentes") p.set("ordem", sortBy);
    if (status.length) p.set("status", status.join(","));
    if (priority.length) p.set("prioridade", priority.join(","));
    if (stage.length) p.set("estagio", stage.join(","));
    if (category.length) p.set("categoria", category.join(","));
    if (client.length) p.set("cliente", client.join(","));
    if (tag.length) p.set("tag", tag.join(","));
    if (onlyFav) p.set("favoritos", "1");
    if (showArchived) p.set("arquivados", "1");
    const qs = p.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    window.history.replaceState(null, "", next);
  }, [query, view, groupBy, sortBy, status, priority, stage, category, client, tag, onlyFav, showArchived, pathname]);

  const filtered = useMemo(() => {
    let list = projects.filter((p) => (showArchived ? true : !p.is_archived));
    if (onlyFav) list = list.filter((p) => p.is_favorite || p.is_pinned);
    if (status.length) list = list.filter((p) => status.includes(p.status));
    if (priority.length) list = list.filter((p) => priority.includes(p.priority));
    if (stage.length) list = list.filter((p) => stage.includes(p.stage));
    if (category.length) list = list.filter((p) => p.category && category.includes(p.category.slug));
    if (client.length) list = list.filter((p) => p.client && client.includes(p.client.slug));
    if (tag.length) list = list.filter((p) => p.tags.some((t) => tag.includes(t.slug)));

    const q = query.trim();
    if (q) {
      const scored = list
        .map((p) => {
          const hay = [p.name, p.codename, p.summary, p.domain, p.category?.name, p.client?.name, ...p.tech, ...p.tags.map((t) => t.name)]
            .filter(Boolean)
            .join(" ");
          return { p, score: Math.max(fuzzyScore(p.name, q) * 2, fuzzyScore(hay, q)) };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      list = scored.map((x) => x.p);
      return list;
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      switch (sortBy) {
        case "nome":
          return a.name.localeCompare(b.name, "pt-BR");
        case "prioridade":
          return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight || a.name.localeCompare(b.name);
        case "progresso":
          return b.progress - a.progress;
        case "criacao":
          return b.created_at.localeCompare(a.created_at);
        default:
          return b.last_activity_at.localeCompare(a.last_activity_at);
      }
    });
    return sorted;
  }, [projects, showArchived, onlyFav, status, priority, stage, category, client, tag, query, sortBy]);

  const activeFilterCount =
    status.length + priority.length + stage.length + category.length + client.length + tag.length + (onlyFav ? 1 : 0) + (showArchived ? 1 : 0);

  function clearAll() {
    setStatus([]);
    setPriority([]);
    setStage([]);
    setCategory([]);
    setClient([]);
    setTag([]);
    setOnlyFav(false);
    setShowArchived(false);
    setQuery("");
  }

  const groups = useMemo(() => groupProjects(filtered, groupBy, categories, clients), [filtered, groupBy, categories, clients]);

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------------- comandos */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-4)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar projetos…"
            className="input pl-9"
            aria-label="Filtrar projetos"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1.5 text-[var(--text-4)] hover:text-[var(--text)]"
              aria-label="Limpar filtro"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn("btn", activeFilterCount > 0 || filtersOpen ? "btn-default" : "btn-subtle")}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeFilterCount > 0 ? (
            <span className="num ml-0.5 rounded-full bg-[var(--accent)] px-1.5 text-[0.625rem] font-semibold text-[var(--accent-fg)]">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <Menu
          align="end"
          sheetTitle="Ordenar por"
          items={(Object.keys(SORT_LABEL) as SortBy[]).map((k) => ({
            key: k,
            label: SORT_LABEL[k],
            checked: sortBy === k,
            onSelect: () => setSortBy(k),
          }))}
          trigger={
            <button type="button" className="btn btn-subtle" title="Ordenação">
              <ArrowDownUp size={14} />
              <span className="hidden md:inline">{SORT_LABEL[sortBy]}</span>
            </button>
          }
        />

        {view === "quadro" ? (
          <Menu
            align="end"
            sheetTitle="Agrupar por"
            items={(Object.keys(GROUP_LABEL) as GroupBy[]).map((k) => ({
              key: k,
              label: GROUP_LABEL[k],
              checked: groupBy === k,
              onSelect: () => setGroupBy(k),
            }))}
            trigger={
              <button type="button" className="btn btn-subtle" title="Agrupamento">
                <Rows3 size={14} />
                <span className="hidden md:inline">{GROUP_LABEL[groupBy]}</span>
              </button>
            }
          />
        ) : null}

        <Segmented
          value={view}
          onChange={setView}
          ariaLabel="Modo de exibição"
          options={[
            { value: "cards", label: "", icon: <LayoutGrid size={14} />, title: "Cartões" },
            { value: "lista", label: "", icon: <List size={14} />, title: "Lista" },
            { value: "quadro", label: "", icon: <Columns3 size={14} />, title: "Quadro" },
          ]}
        />
      </div>

      {/* --------------------------------------------------------- filtros */}
      {filtersOpen ? (
        <div className="panel anim-rise space-y-4 p-4">
          <FilterRow label="Status">
            {STATUSES.map((sv) => (
              <Toggle
                key={sv}
                on={status.includes(sv)}
                accent={STATUS_META[sv].accent}
                onClick={() => setStatus(toggle(status, sv))}
              >
                <span className="dot" />
                {STATUS_META[sv].label}
              </Toggle>
            ))}
          </FilterRow>

          <FilterRow label="Prioridade">
            {PRIORITIES.map((pv) => (
              <Toggle
                key={pv}
                on={priority.includes(pv)}
                accent={PRIORITY_META[pv].accent}
                onClick={() => setPriority(toggle(priority, pv))}
              >
                <PriorityBars weight={PRIORITY_META[pv].weight} />
                {PRIORITY_META[pv].label}
              </Toggle>
            ))}
          </FilterRow>

          <FilterRow label="Estágio">
            {STAGES.map((sv) => (
              <Toggle key={sv} on={stage.includes(sv)} onClick={() => setStage(toggle(stage, sv))}>
                {STAGE_META[sv].label}
              </Toggle>
            ))}
          </FilterRow>

          {categories.length > 0 ? (
            <FilterRow label="Categoria">
              {categories.map((c) => (
                <Toggle
                  key={c.id}
                  on={category.includes(c.slug)}
                  accent={c.color}
                  onClick={() => setCategory(toggle(category, c.slug))}
                >
                  <Icon name={c.icon} size={11} />
                  {c.name}
                </Toggle>
              ))}
            </FilterRow>
          ) : null}

          {clients.length > 0 ? (
            <FilterRow label="Cliente">
              {clients.map((c) => (
                <Toggle key={c.id} on={client.includes(c.slug)} accent={c.color} onClick={() => setClient(toggle(client, c.slug))}>
                  {c.name}
                </Toggle>
              ))}
            </FilterRow>
          ) : null}

          {tags.length > 0 ? (
            <FilterRow label="Tags">
              {tags.map((t) => (
                <Toggle key={t.id} on={tag.includes(t.slug)} accent={t.color} onClick={() => setTag(toggle(tag, t.slug))}>
                  #{t.name}
                </Toggle>
              ))}
            </FilterRow>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-3">
            <Toggle on={onlyFav} accent="amber" onClick={() => setOnlyFav(!onlyFav)}>
              <Star size={11} />
              Só favoritos e fixados
            </Toggle>
            <Toggle on={showArchived} onClick={() => setShowArchived(!showArchived)}>
              <Archive size={11} />
              Incluir arquivados
            </Toggle>
            {activeFilterCount > 0 ? (
              <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm ml-auto">
                <X size={13} />
                Limpar tudo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------- contador */}
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-4)]">
        <p>
          <span className="num font-semibold text-[var(--text-2)]">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "projeto" : "projetos"}
          {activeFilterCount > 0 || query ? " · filtro aplicado" : ""}
        </p>
        {activeFilterCount > 0 || query ? (
          <button type="button" onClick={clearAll} className="link-quiet text-xs">
            Limpar
          </button>
        ) : null}
      </div>

      {/* ------------------------------------------------------- resultados */}
      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Search size={19} />}
            title={projects.length === 0 ? "Nenhum projeto cadastrado" : "Nada corresponde a esse filtro"}
            description={
              projects.length === 0
                ? "Comece cadastrando seu primeiro produto, sistema ou ideia."
                : "Ajuste os filtros ou limpe a busca para ver mais resultados."
            }
            action={
              projects.length === 0 ? (
                <Link href="/projetos/novo" className="btn btn-primary">
                  <Plus size={15} />
                  Novo projeto
                </Link>
              ) : (
                <button type="button" onClick={clearAll} className="btn btn-default">
                  Limpar filtros
                </button>
              )
            }
          />
        </div>
      ) : view === "cards" ? (
        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} now={now} />
          ))}
        </div>
      ) : view === "lista" ? (
        <ProjectTable projects={filtered} now={now} />
      ) : (
        <Board groups={groups} now={now} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ lista */

function ProjectTable({ projects, now }: { projects: Project[]; now: number }) {
  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[minmax(0,2.4fr)_8rem_7rem_minmax(0,1fr)_5.5rem_6rem] items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-[0.625rem] font-semibold tracking-[0.08em] text-[var(--text-4)] uppercase lg:grid">
        <span>Projeto</span>
        <span>Status</span>
        <span>Prioridade</span>
        <span>Próximo passo</span>
        <span className="text-right">Progresso</span>
        <span className="text-right">Atividade</span>
      </div>
      <ul className="divided">
        {projects.map((p) => {
          const health = healthScore(p, now);
          return (
            <li key={p.id}>
              <Link
                href={`/projetos/${p.slug}`}
                className="row grid grid-cols-1 items-center gap-x-3 gap-y-2 px-3.5 py-3 lg:grid-cols-[minmax(0,2.4fr)_8rem_7rem_minmax(0,1fr)_5.5rem_6rem]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <EntityAvatar icon={p.icon} accent={p.color} size="sm" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[0.8125rem] font-medium">{p.name}</span>
                      {p.is_pinned ? <Pin size={10} className="flex-none text-[var(--accent)]" fill="currentColor" /> : null}
                      {p.is_favorite ? <Star size={10} className="flex-none text-[var(--warn)]" fill="currentColor" /> : null}
                      {p.is_archived ? <span className="chip chip-quiet flex-none">Arquivado</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--text-4)]">
                      {[p.category?.name, p.client?.name].filter(Boolean).join(" · ") || p.summary || "—"}
                    </span>
                  </span>
                </span>

                <span className="flex items-center gap-2 lg:block">
                  <StatusChip status={p.status} compact />
                </span>

                <span className="hidden items-center gap-1.5 text-[0.75rem] text-[var(--text-2)] lg:flex">
                  <PriorityBars weight={PRIORITY_META[p.priority].weight} />
                  {PRIORITY_META[p.priority].label}
                </span>

                <span className="hidden min-w-0 truncate text-[0.75rem] text-[var(--text-3)] lg:block">
                  {p.nextStep?.title ?? <span className="text-[var(--text-4)] italic">sem próximo passo</span>}
                </span>

                <span className="flex items-center gap-2 lg:justify-end">
                  <Meter value={p.progress} accent={p.color} className="w-full max-w-24 lg:w-12" />
                  <span className="num flex-none text-[0.6875rem] text-[var(--text-3)]">{p.progress}%</span>
                </span>

                <span className="hidden items-center justify-end gap-2 text-[0.6875rem] text-[var(--text-4)] lg:flex">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: health >= 75 ? "var(--ok)" : health >= 45 ? "var(--warn)" : "var(--bad)" }}
                    title={`Saúde ${health}/100`}
                  />
                  <span className="num">{relativeTime(p.last_activity_at, now)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ quadro */

interface Group {
  key: string;
  label: string;
  accent: string;
  items: Project[];
}

function groupProjects(projects: Project[], by: GroupBy, categories: Category[], clients: Client[]): Group[] {
  const make = (key: string, label: string, accent: string): Group => ({ key, label, accent, items: [] });
  let groups: Group[] = [];
  let pick: (p: Project) => string;

  if (by === "status") {
    groups = KANBAN_STATUS_ORDER.map((s) => make(s, STATUS_META[s].label, STATUS_META[s].accent));
    pick = (p) => p.status;
  } else if (by === "prioridade") {
    groups = PRIORITIES.map((p) => make(p, PRIORITY_META[p].label, PRIORITY_META[p].accent));
    pick = (p) => p.priority;
  } else if (by === "estagio") {
    groups = STAGES.map((s) => make(s, STAGE_META[s].label, "slate"));
    pick = (p) => p.stage;
  } else if (by === "categoria") {
    groups = categories.map((c) => make(c.slug, c.name, c.color));
    groups.push(make("__none", "Sem categoria", "slate"));
    pick = (p) => p.category?.slug ?? "__none";
  } else {
    groups = clients.map((c) => make(c.slug, c.name, c.color));
    groups.push(make("__none", "Sem cliente", "slate"));
    pick = (p) => p.client?.slug ?? "__none";
  }

  const map = new Map(groups.map((g) => [g.key, g]));
  for (const p of projects) {
    const g = map.get(pick(p));
    if (g) g.items.push(p);
  }
  return groups.filter((g) => g.items.length > 0);
}

function Board({ groups, now }: { groups: Group[]; now: number }) {
  if (groups.length === 0) return null;
  return (
    <div className="scroll-x -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {groups.map((g) => (
          <section key={g.key} className={cn(`ac-${g.accent}`, "w-[19rem] flex-none")}>
            <header className="mb-2 flex items-center gap-2 px-1">
              <span className="dot" />
              <h3 className="text-[0.8125rem] font-semibold">{g.label}</h3>
              <span className="num ml-auto rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)]">
                {g.items.length}
              </span>
            </header>
            <div className="space-y-2.5 rounded-[var(--radius-lg)] bg-[var(--surface-2)] p-2.5">
              {g.items.map((p) => (
                <BoardCard key={p.id} project={p} now={now} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BoardCard({ project: p, now }: { project: Project; now: number }) {
  return (
    <Link href={`/projetos/${p.slug}`} className="card-link block p-3">
      <div className="flex items-start gap-2.5">
        <EntityAvatar icon={p.icon} accent={p.color} size="xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] leading-tight font-medium">{p.name}</p>
          <p className="mt-1 truncate text-[0.625rem] text-[var(--text-4)]">
            {[p.category?.name, p.client?.name].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {p.is_pinned ? <Pin size={10} className="flex-none text-[var(--accent)]" fill="currentColor" /> : null}
      </div>
      {p.nextStep ? (
        <p className="mt-2.5 line-clamp-2 text-[0.6875rem] leading-snug text-[var(--text-3)]">{p.nextStep.title}</p>
      ) : null}
      <div className="mt-2.5 flex items-center gap-2">
        <Meter value={p.progress} accent={p.color} className="flex-1" />
        <span className="num text-[0.625rem] text-[var(--text-4)]">{p.progress}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[0.625rem] text-[var(--text-4)]">
        <StageTrack stage={p.stage} />
        <span className="num">{relativeTime(p.last_activity_at, now)}</span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------- auxiliares */

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <p className="w-20 flex-none pt-1 text-[0.6875rem] font-medium text-[var(--text-3)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Toggle({
  on,
  accent,
  onClick,
  children,
}: {
  on: boolean;
  accent?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        accent ? `ac-${accent}` : "ac-slate",
        "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 text-[0.6875rem] font-medium transition-all duration-150",
        on
          ? "border-[color-mix(in_oklab,var(--ac)_40%,transparent)] bg-[color-mix(in_oklab,var(--ac)_13%,transparent)] text-[var(--ac)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text)]",
      )}
    >
      {children}
      {on ? <Check size={11} className="opacity-70" /> : null}
    </button>
  );
}

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function splitParam(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}
