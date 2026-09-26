import "server-only";

import { all, bool, get, int, run } from "./db";
import { asAccent, asLinkKind, asPriority, asStage, asStatus } from "./domain";
import type {
  ActivityEntry,
  Category,
  Client,
  Note,
  Project,
  ProjectAsset,
  ProjectCredential,
  ProjectDetail,
  ProjectLink,
  ProjectStep,
  Tag,
  Tool,
  ToolGroup,
} from "./types";

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Mapeadores
// ---------------------------------------------------------------------------

const mapCategory = (r: Row): Category => ({
  id: String(r.id),
  name: String(r.name),
  slug: String(r.slug),
  descricao: (r.descricao as string) ?? null,
  icon: String(r.icon ?? "Layers"),
  color: asAccent(r.color),
  sort: int(r.sort),
});

const mapClient = (r: Row): Client => ({
  id: String(r.id),
  name: String(r.name),
  slug: String(r.slug),
  company: (r.company as string) ?? null,
  contact: (r.contact as string) ?? null,
  email: (r.email as string) ?? null,
  phone: (r.phone as string) ?? null,
  website: (r.website as string) ?? null,
  notes: (r.notes as string) ?? null,
  color: asAccent(r.color),
  icon: String(r.icon ?? "Building2"),
  archived: bool(r.archived),
  sort: int(r.sort),
  created_at: String(r.created_at),
  updated_at: String(r.updated_at),
});

const mapTag = (r: Row): Tag => ({
  id: String(r.id),
  name: String(r.name),
  slug: String(r.slug),
  color: asAccent(r.color),
});

const mapLink = (r: Row): ProjectLink => ({
  id: String(r.id),
  project_id: String(r.project_id),
  kind: asLinkKind(r.kind),
  label: String(r.label),
  url: String(r.url),
  note: (r.note as string) ?? null,
  sort: int(r.sort),
  is_primary: bool(r.is_primary),
  monitor: bool(r.monitor),
  last_status: r.last_status === null || r.last_status === undefined ? null : int(r.last_status),
  last_checked_at: (r.last_checked_at as string) ?? null,
  last_error: (r.last_error as string) ?? null,
});

const mapStep = (r: Row): ProjectStep => ({
  id: String(r.id),
  project_id: String(r.project_id),
  title: String(r.title),
  done: bool(r.done),
  due_at: (r.due_at as string) ?? null,
  sort: int(r.sort),
  done_at: (r.done_at as string) ?? null,
  created_at: String(r.created_at),
});

const mapNote = (r: Row): Note => ({
  id: String(r.id),
  project_id: (r.project_id as string) ?? null,
  title: (r.title as string) ?? null,
  body: String(r.body),
  pinned: bool(r.pinned),
  created_at: String(r.created_at),
  updated_at: String(r.updated_at),
});

const mapTool = (r: Row): Tool => ({
  id: String(r.id),
  group_id: (r.group_id as string) ?? null,
  name: String(r.name),
  url: String(r.url),
  subtitle: (r.subtitle as string) ?? null,
  icon: String(r.icon ?? "ExternalLink"),
  color: asAccent(r.color),
  favorite: bool(r.favorite),
  sort: int(r.sort),
  opens: int(r.opens),
});

const mapActivity = (r: Row): ActivityEntry => ({
  id: String(r.id),
  project_id: (r.project_id as string) ?? null,
  entity: String(r.entity),
  entity_id: (r.entity_id as string) ?? null,
  action: String(r.action),
  title: String(r.title),
  detail: (r.detail as string) ?? null,
  created_at: String(r.created_at),
});

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

export function listCategories(): Category[] {
  return all("SELECT * FROM categories ORDER BY sort, name").map(mapCategory);
}

export function listClients(includeArchived = false): Client[] {
  const sql = includeArchived
    ? "SELECT * FROM clients ORDER BY archived, sort, name"
    : "SELECT * FROM clients WHERE archived = 0 ORDER BY sort, name";
  return all<Row>(sql).map(mapClient);
}

export function getClientBySlug(slug: string): Client | null {
  const row = get<Row>("SELECT * FROM clients WHERE slug = ?", [slug]);
  return row ? mapClient(row) : null;
}

export function listTags(): Tag[] {
  return all("SELECT * FROM tags ORDER BY name").map(mapTag);
}

export function tagUsage(): Record<string, number> {
  const rows = all<{ tag_id: string; n: number }>(
    "SELECT tag_id, COUNT(*) AS n FROM project_tags GROUP BY tag_id",
  );
  return Object.fromEntries(rows.map((r) => [r.tag_id, r.n]));
}

export function listToolGroups(): ToolGroup[] {
  return all<Row>("SELECT * FROM tool_groups ORDER BY sort, name").map((r) => ({
    id: String(r.id),
    name: String(r.name),
    icon: String(r.icon ?? "Grid2x2"),
    sort: int(r.sort),
  }));
}

export function listTools(): Tool[] {
  return all<Row>("SELECT * FROM tools ORDER BY sort, name").map(mapTool);
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------

const PROJECT_SELECT = `
  SELECT p.*,
         c.id   AS cat_id,   c.name AS cat_name, c.slug AS cat_slug,
         c.icon AS cat_icon, c.color AS cat_color,
         cl.id   AS cli_id,  cl.name AS cli_name, cl.slug AS cli_slug,
         cl.color AS cli_color, cl.icon AS cli_icon
  FROM projects p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN clients cl   ON cl.id = p.client_id
`;

interface Aggregates {
  tags: Map<string, Tag[]>;
  tech: Map<string, string[]>;
  links: Map<string, number>;
  broken: Map<string, number>;
  primary: Map<string, string>;
  openSteps: Map<string, number>;
  nextStep: Map<string, { id: string; title: string; due_at: string | null }>;
}

function aggregatesFor(ids: string[]): Aggregates {
  const empty: Aggregates = {
    tags: new Map(),
    tech: new Map(),
    links: new Map(),
    broken: new Map(),
    primary: new Map(),
    openSteps: new Map(),
    nextStep: new Map(),
  };
  if (ids.length === 0) return empty;
  const ph = ids.map(() => "?").join(",");

  for (const r of all<Row>(
    `SELECT pt.project_id, t.* FROM project_tags pt
     JOIN tags t ON t.id = pt.tag_id
     WHERE pt.project_id IN (${ph}) ORDER BY t.name`,
    ids,
  )) {
    const key = String(r.project_id);
    const list = empty.tags.get(key) ?? [];
    list.push(mapTag(r));
    empty.tags.set(key, list);
  }

  for (const r of all<{ project_id: string; name: string }>(
    `SELECT project_id, name FROM project_tech WHERE project_id IN (${ph}) ORDER BY sort, name`,
    ids,
  )) {
    const list = empty.tech.get(r.project_id) ?? [];
    list.push(r.name);
    empty.tech.set(r.project_id, list);
  }

  for (const r of all<{ project_id: string; n: number; broken: number }>(
    `SELECT project_id, COUNT(*) AS n,
            SUM(CASE WHEN last_status IS NOT NULL AND (last_status = 0 OR last_status >= 400) THEN 1 ELSE 0 END) AS broken
     FROM project_links WHERE project_id IN (${ph}) GROUP BY project_id`,
    ids,
  )) {
    empty.links.set(r.project_id, r.n);
    empty.broken.set(r.project_id, r.broken ?? 0);
  }

  for (const r of all<{ project_id: string; url: string }>(
    `SELECT project_id, url FROM project_links
     WHERE project_id IN (${ph})
     ORDER BY is_primary DESC, CASE kind WHEN 'production' THEN 0 WHEN 'staging' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, sort`,
    ids,
  )) {
    if (!empty.primary.has(r.project_id)) empty.primary.set(r.project_id, r.url);
  }

  for (const r of all<{ project_id: string; id: string; title: string; due_at: string | null; n: number }>(
    `SELECT project_id, COUNT(*) AS n FROM project_steps
     WHERE project_id IN (${ph}) AND done = 0 GROUP BY project_id`,
    ids,
  )) {
    empty.openSteps.set(r.project_id, r.n);
  }

  for (const r of all<{ project_id: string; id: string; title: string; due_at: string | null }>(
    `SELECT project_id, id, title, due_at FROM project_steps
     WHERE project_id IN (${ph}) AND done = 0
     ORDER BY (due_at IS NULL), due_at, sort, created_at`,
    ids,
  )) {
    if (!empty.nextStep.has(r.project_id)) {
      empty.nextStep.set(r.project_id, { id: r.id, title: r.title, due_at: r.due_at });
    }
  }

  return empty;
}

function mapProject(r: Row, agg: Aggregates): Project {
  const id = String(r.id);
  return {
    id,
    name: String(r.name),
    slug: String(r.slug),
    codename: (r.codename as string) ?? null,
    summary: (r.summary as string) ?? null,
    description: (r.description as string) ?? null,
    icon: String(r.icon ?? "Box"),
    color: asAccent(r.color, "indigo"),
    category_id: (r.category_id as string) ?? null,
    client_id: (r.client_id as string) ?? null,
    status: asStatus(r.status),
    stage: asStage(r.stage),
    priority: asPriority(r.priority),
    progress: int(r.progress),
    owner: (r.owner as string) ?? null,
    domain: (r.domain as string) ?? null,
    started_at: (r.started_at as string) ?? null,
    target_at: (r.target_at as string) ?? null,
    launched_at: (r.launched_at as string) ?? null,
    notes: (r.notes as string) ?? null,
    is_favorite: bool(r.is_favorite),
    is_pinned: bool(r.is_pinned),
    is_archived: bool(r.is_archived),
    sort: int(r.sort),
    last_activity_at: String(r.last_activity_at),
    last_opened_at: (r.last_opened_at as string) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    category: r.cat_id
      ? {
          id: String(r.cat_id),
          name: String(r.cat_name),
          slug: String(r.cat_slug),
          icon: String(r.cat_icon),
          color: asAccent(r.cat_color),
        }
      : null,
    client: r.cli_id
      ? {
          id: String(r.cli_id),
          name: String(r.cli_name),
          slug: String(r.cli_slug),
          color: asAccent(r.cli_color),
          icon: String(r.cli_icon),
        }
      : null,
    tags: agg.tags.get(id) ?? [],
    tech: agg.tech.get(id) ?? [],
    linkCount: agg.links.get(id) ?? 0,
    brokenLinks: agg.broken.get(id) ?? 0,
    openSteps: agg.openSteps.get(id) ?? 0,
    nextStep: agg.nextStep.get(id) ?? null,
    primaryUrl: agg.primary.get(id) ?? null,
  };
}

function hydrate(rows: Row[]): Project[] {
  const agg = aggregatesFor(rows.map((r) => String(r.id)));
  return rows.map((r) => mapProject(r, agg));
}

export function listProjects(opts: { includeArchived?: boolean } = {}): Project[] {
  const where = opts.includeArchived ? "" : "WHERE p.is_archived = 0";
  return hydrate(all<Row>(`${PROJECT_SELECT} ${where} ORDER BY p.is_pinned DESC, p.sort, p.name`));
}

export function getProject(slug: string): ProjectDetail | null {
  const row = get<Row>(`${PROJECT_SELECT} WHERE p.slug = ?`, [slug]);
  if (!row) return null;
  const base = hydrate([row])[0];
  const id = base.id;
  return {
    ...base,
    links: all<Row>(
      "SELECT * FROM project_links WHERE project_id = ? ORDER BY is_primary DESC, sort, label",
      [id],
    ).map(mapLink),
    steps: all<Row>(
      "SELECT * FROM project_steps WHERE project_id = ? ORDER BY done, (due_at IS NULL), due_at, sort, created_at",
      [id],
    ).map(mapStep),
    credentials: all<Row>("SELECT * FROM project_credentials WHERE project_id = ? ORDER BY sort, label", [id]).map(
      (r): ProjectCredential => ({
        id: String(r.id),
        project_id: String(r.project_id),
        label: String(r.label),
        vault: (r.vault as string) ?? null,
        identifier: (r.identifier as string) ?? null,
        url: (r.url as string) ?? null,
        note: (r.note as string) ?? null,
        rotated_at: (r.rotated_at as string) ?? null,
        sort: int(r.sort),
      }),
    ),
    assets: all<Row>("SELECT * FROM project_assets WHERE project_id = ? ORDER BY sort, label", [id]).map(
      (r): ProjectAsset => ({
        id: String(r.id),
        project_id: String(r.project_id),
        label: String(r.label),
        location: String(r.location),
        kind: String(r.kind),
        note: (r.note as string) ?? null,
        sort: int(r.sort),
      }),
    ),
    projectNotes: all<Row>(
      "SELECT * FROM notes WHERE project_id = ? ORDER BY pinned DESC, updated_at DESC",
      [id],
    ).map(mapNote),
    activity: all<Row>("SELECT * FROM activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 40", [id]).map(
      mapActivity,
    ),
  };
}

// ---------------------------------------------------------------------------
// Notas soltas, atividade, links globais
// ---------------------------------------------------------------------------

export function listAllNotes(limit = 200): Array<Note & { projectName: string | null; projectSlug: string | null }> {
  return all<Row>(
    `SELECT n.*, p.name AS project_name, p.slug AS project_slug
     FROM notes n LEFT JOIN projects p ON p.id = n.project_id
     ORDER BY n.pinned DESC, n.updated_at DESC LIMIT ?`,
    [limit],
  ).map((r) => ({
    ...mapNote(r),
    projectName: (r.project_name as string) ?? null,
    projectSlug: (r.project_slug as string) ?? null,
  }));
}

export interface ActivityWithProject extends ActivityEntry {
  projectName: string | null;
  projectSlug: string | null;
  projectIcon: string | null;
  projectColor: string | null;
}

export function listActivity(limit = 40, offset = 0): ActivityWithProject[] {
  return all<Row>(
    `SELECT a.*, p.name AS project_name, p.slug AS project_slug, p.icon AS project_icon, p.color AS project_color
     FROM activity a LEFT JOIN projects p ON p.id = a.project_id
     ORDER BY a.created_at DESC, a.rowid DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  ).map((r) => ({
    ...mapActivity(r),
    projectName: (r.project_name as string) ?? null,
    projectSlug: (r.project_slug as string) ?? null,
    projectIcon: (r.project_icon as string) ?? null,
    projectColor: (r.project_color as string) ?? null,
  }));
}

export function countActivity(): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM activity")?.n ?? 0;
}

export interface LinkWithProject extends ProjectLink {
  projectName: string;
  projectSlug: string;
  projectIcon: string;
  projectColor: string;
}

export function listAllLinks(onlyMonitored = false): LinkWithProject[] {
  const where = onlyMonitored ? "WHERE l.monitor = 1" : "";
  return all<Row>(
    `SELECT l.*, p.name AS project_name, p.slug AS project_slug, p.icon AS project_icon, p.color AS project_color
     FROM project_links l JOIN projects p ON p.id = l.project_id
     ${where} ORDER BY p.name, l.sort`,
  ).map((r) => ({
    ...mapLink(r),
    projectName: String(r.project_name),
    projectSlug: String(r.project_slug),
    projectIcon: String(r.project_icon),
    projectColor: String(r.project_color),
  }));
}

export function logActivity(entry: {
  projectId?: string | null;
  entity?: string;
  entityId?: string | null;
  action: string;
  title: string;
  detail?: string | null;
}) {
  run(
    "INSERT INTO activity (id, project_id, entity, entity_id, action, title, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      crypto.randomUUID(),
      entry.projectId ?? null,
      entry.entity ?? "project",
      entry.entityId ?? null,
      entry.action,
      entry.title,
      entry.detail ?? null,
    ],
  );
  run("DELETE FROM activity WHERE id IN (SELECT id FROM activity ORDER BY created_at DESC LIMIT -1 OFFSET 2000)");
}

/** Marca visita — alimenta "abertos recentemente" no Command Center. */
export function markProjectOpened(projectId: string) {
  run("UPDATE projects SET last_opened_at = datetime('now') WHERE id = ?", [projectId]);
}

export function touchProject(projectId: string, activity = true) {
  run(
    `UPDATE projects SET updated_at = datetime('now')${activity ? ", last_activity_at = datetime('now')" : ""} WHERE id = ?`,
    [projectId],
  );
}
