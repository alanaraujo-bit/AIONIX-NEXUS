import "server-only";

import { all } from "./db";
import { LINK_KIND_META, PRIORITY_META, STAGE_META, STATUS_META, asAccent, asLinkKind, asStatus } from "./domain";
import { ALL_NAV } from "./nav";
import { KIND_ORDER, type SearchEntry } from "./search-types";

export { KIND_LABEL, type SearchEntry, type SearchKind } from "./search-types";

/** Índice completo, montado em uma leitura por request. */
export function buildSearchIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];

  for (const nav of ALL_NAV) {
    out.push({
      id: `page:${nav.href}`,
      kind: "page",
      title: nav.label,
      subtitle: nav.href,
      keywords: `ir para abrir ${nav.label}`,
      href: nav.href,
      icon: nav.icon,
      accent: "slate",
      boost: 0,
    });
  }

  const projects = all<{
    id: string;
    name: string;
    slug: string;
    codename: string | null;
    summary: string | null;
    icon: string;
    color: string;
    status: string;
    stage: string;
    priority: string;
    domain: string | null;
    is_pinned: number;
    is_favorite: number;
    is_archived: number;
    cat: string | null;
    cli: string | null;
    tech: string | null;
    tags: string | null;
  }>(`
    SELECT p.id, p.name, p.slug, p.codename, p.summary, p.icon, p.color, p.status, p.stage, p.priority,
           p.domain, p.is_pinned, p.is_favorite, p.is_archived,
           c.name AS cat, cl.name AS cli,
           (SELECT group_concat(name, ' ') FROM project_tech WHERE project_id = p.id) AS tech,
           (SELECT group_concat(t.name, ' ') FROM project_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.project_id = p.id) AS tags
    FROM projects p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN clients cl ON cl.id = p.client_id
    ORDER BY p.is_pinned DESC, p.name
  `);

  for (const p of projects) {
    const status = asStatus(p.status);
    out.push({
      id: `project:${p.id}`,
      kind: "project",
      title: p.name,
      subtitle: [STATUS_META[status].label, p.cat, p.cli].filter(Boolean).join(" · "),
      keywords: [
        p.codename,
        p.summary,
        p.domain,
        p.cat,
        p.cli,
        p.tech,
        p.tags,
        STATUS_META[status].label,
        STAGE_META[(p.stage as keyof typeof STAGE_META) ?? "build"]?.label,
        PRIORITY_META[(p.priority as keyof typeof PRIORITY_META) ?? "medium"]?.label,
        p.is_archived ? "arquivado" : "",
      ]
        .filter(Boolean)
        .join(" "),
      href: `/projetos/${p.slug}`,
      icon: p.icon,
      accent: asAccent(p.color, "indigo"),
      badge: p.is_archived ? "Arquivado" : STATUS_META[status].short,
      boost: (p.is_pinned ? 60 : 0) + (p.is_favorite ? 30 : 0) + (p.is_archived ? -80 : 0),
    });
  }

  const links = all<{
    id: string;
    label: string;
    url: string;
    kind: string;
    pname: string;
    pslug: string;
    pcolor: string;
  }>(`
    SELECT l.id, l.label, l.url, l.kind, p.name AS pname, p.slug AS pslug, p.color AS pcolor
    FROM project_links l JOIN projects p ON p.id = l.project_id
    ORDER BY p.name, l.sort
  `);

  for (const l of links) {
    const kind = asLinkKind(l.kind);
    const meta = LINK_KIND_META[kind];
    out.push({
      id: `link:${l.id}`,
      kind: "link",
      title: `${meta.label} · ${l.pname}`,
      subtitle: l.label === meta.label ? l.url : `${l.label} — ${l.url}`,
      keywords: `abrir ${l.pname} ${meta.label} ${l.label} ${l.url} ${kind}`,
      url: l.url,
      icon: meta.icon,
      accent: asAccent(l.pcolor, meta.accent),
      badge: "Abrir",
      boost: kind === "production" ? 12 : kind === "repo" || kind === "admin" ? 8 : 0,
    });
  }

  for (const t of all<{
    id: string;
    name: string;
    url: string;
    subtitle: string | null;
    icon: string;
    color: string;
    favorite: number;
    opens: number;
    gname: string | null;
  }>(`SELECT t.*, g.name AS gname FROM tools t LEFT JOIN tool_groups g ON g.id = t.group_id ORDER BY t.sort`)) {
    out.push({
      id: `tool:${t.id}`,
      kind: "tool",
      title: t.name,
      subtitle: t.subtitle ?? t.gname ?? t.url,
      keywords: `${t.url} ${t.gname ?? ""} ferramenta atalho abrir`,
      url: t.url,
      icon: t.icon,
      accent: asAccent(t.color),
      badge: "Abrir",
      boost: (t.favorite ? 25 : 0) + Math.min(20, t.opens),
    });
  }

  for (const c of all<{ id: string; name: string; slug: string; company: string | null; icon: string; color: string; n: number }>(
    `SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) AS n FROM clients c ORDER BY c.name`,
  )) {
    out.push({
      id: `client:${c.id}`,
      kind: "client",
      title: c.name,
      subtitle: c.company ?? `${c.n} projeto${c.n === 1 ? "" : "s"}`,
      keywords: `cliente ${c.company ?? ""}`,
      href: `/clientes/${c.slug}`,
      icon: c.icon,
      accent: asAccent(c.color),
      boost: 0,
    });
  }

  for (const c of all<{ id: string; name: string; slug: string; icon: string; color: string }>(
    "SELECT id, name, slug, icon, color FROM categories ORDER BY sort",
  )) {
    out.push({
      id: `category:${c.id}`,
      kind: "category",
      title: c.name,
      subtitle: "Categoria",
      keywords: "categoria filtrar",
      href: `/projetos?categoria=${c.slug}`,
      icon: c.icon,
      accent: asAccent(c.color),
      boost: -10,
    });
  }

  for (const t of all<{ id: string; name: string; slug: string; color: string }>(
    "SELECT id, name, slug, color FROM tags ORDER BY name",
  )) {
    out.push({
      id: `tag:${t.id}`,
      kind: "tag",
      title: `#${t.name}`,
      subtitle: "Tag",
      keywords: "tag etiqueta filtrar",
      href: `/projetos?tag=${t.slug}`,
      icon: "Tag",
      accent: asAccent(t.color),
      boost: -20,
    });
  }

  for (const n of all<{ id: string; title: string | null; body: string; slug: string | null }>(
    `SELECT n.id, n.title, n.body, p.slug FROM notes n LEFT JOIN projects p ON p.id = n.project_id
     ORDER BY n.updated_at DESC LIMIT 120`,
  )) {
    const first = n.title ?? n.body.split("\n")[0].slice(0, 70);
    out.push({
      id: `note:${n.id}`,
      kind: "note",
      title: first || "Nota",
      subtitle: n.slug ? "Nota de projeto" : "Nota avulsa",
      keywords: n.body.slice(0, 400),
      href: n.slug ? `/projetos/${n.slug}#notas` : "/notas",
      icon: "NotebookPen",
      accent: "amber",
      boost: -30,
    });
  }

  return out.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.boost - a.boost);
}
