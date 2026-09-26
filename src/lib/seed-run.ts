/**
 * Semeadura do portfólio de demonstração, escrita contra uma interface mínima
 * de banco para servir tanto à server action quanto ao script `npm run db:seed`.
 */

import { LINK_KIND_META } from "./domain.ts";
import { SEED_CLIENTS, SEED_PROJECTS, SEED_TAGS } from "./seed-data.ts";
import { slugify } from "./utils.ts";

export interface SeedDb {
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;
  run(sql: string, params?: unknown[]): unknown;
  uid(): string;
}

const daysAgoSql = (n: number) => `datetime('now', '-${Math.max(0, Math.round(n))} days')`;
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const isoInDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export function seedDemo(db: SeedDb): { created: number; skipped: number } {
  let created = 0;
  let skipped = 0;

  const clientIds = new Map<string, string>();
  SEED_CLIENTS.forEach((c, i) => {
    const slug = slugify(c.name);
    let row = db.get<{ id: string }>("SELECT id FROM clients WHERE slug = ?", [slug]);
    if (!row) {
      const id = db.uid();
      db.run(
        "INSERT INTO clients (id, name, slug, company, contact, email, website, notes, color, icon, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [id, c.name, slug, c.company ?? null, c.contact ?? null, c.email ?? null, c.website ?? null, c.notes ?? null, c.color, c.icon, i],
      );
      row = { id };
    }
    clientIds.set(c.name, row.id);
  });

  const tagIds = new Map<string, string>();
  for (const t of SEED_TAGS) {
    const slug = slugify(t.name);
    let row = db.get<{ id: string }>("SELECT id FROM tags WHERE slug = ?", [slug]);
    if (!row) {
      const id = db.uid();
      db.run("INSERT INTO tags (id, name, slug, color) VALUES (?,?,?,?)", [id, t.name, slug, t.color]);
      row = { id };
    }
    tagIds.set(t.name, row.id);
  }

  SEED_PROJECTS.forEach((p, index) => {
    const slug = slugify(p.name);
    if (db.get("SELECT 1 FROM projects WHERE slug = ?", [slug])) {
      skipped += 1;
      return;
    }

    const categoryId = db.get<{ id: string }>("SELECT id FROM categories WHERE slug = ?", [p.category])?.id ?? null;
    const projectId = db.uid();
    const startedAgo = p.startedDaysAgo ?? p.activityDaysAgo;

    db.run(
      `INSERT INTO projects (id, name, slug, codename, summary, description, icon, color, category_id, client_id,
         status, stage, priority, progress, owner, domain, started_at,
         is_favorite, is_pinned, is_archived, sort, last_activity_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ${daysAgoSql(p.activityDaysAgo)}, ${daysAgoSql(startedAgo)}, ${daysAgoSql(p.activityDaysAgo)})`,
      [
        projectId,
        p.name,
        slug,
        p.codename ?? null,
        p.summary,
        p.description ?? null,
        p.icon,
        p.color,
        categoryId,
        p.client ? (clientIds.get(p.client) ?? null) : null,
        p.status,
        p.stage,
        p.priority,
        p.progress,
        p.owner ?? null,
        p.domain ?? null,
        p.startedDaysAgo ? isoDaysAgo(p.startedDaysAgo) : null,
        p.favorite ? 1 : 0,
        p.pinned ? 1 : 0,
        p.archived ? 1 : 0,
        index,
      ],
    );

    p.tech.forEach((name, i) =>
      db.run("INSERT OR IGNORE INTO project_tech (project_id, name, sort) VALUES (?,?,?)", [projectId, name, i]),
    );

    for (const tag of p.tags) {
      const tid = tagIds.get(tag);
      if (tid) db.run("INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?,?)", [projectId, tid]);
    }

    p.links.forEach((l, i) =>
      db.run(
        "INSERT INTO project_links (id, project_id, kind, label, url, note, sort, is_primary, monitor) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          db.uid(),
          projectId,
          l.kind,
          l.label ?? LINK_KIND_META[l.kind].label,
          l.url,
          l.note ?? null,
          i,
          l.primary ? 1 : 0,
          l.monitor === false ? 0 : 1,
        ],
      ),
    );

    p.steps.forEach((st, i) =>
      db.run("INSERT INTO project_steps (id, project_id, title, done, due_at, sort, done_at) VALUES (?,?,?,?,?,?,?)", [
        db.uid(),
        projectId,
        st.title,
        st.done ? 1 : 0,
        st.dueInDays === undefined ? null : isoInDays(st.dueInDays),
        i,
        st.done ? new Date().toISOString() : null,
      ]),
    );

    (p.notes ?? []).forEach((n) =>
      db.run("INSERT INTO notes (id, project_id, title, body, pinned) VALUES (?,?,?,?,?)", [
        db.uid(),
        projectId,
        n.title ?? null,
        n.body,
        n.pinned ? 1 : 0,
      ]),
    );

    (p.credentials ?? []).forEach((c, i) =>
      db.run(
        "INSERT INTO project_credentials (id, project_id, label, vault, identifier, url, note, sort) VALUES (?,?,?,?,?,?,?,?)",
        [db.uid(), projectId, c.label, c.vault ?? null, c.identifier ?? null, c.url ?? null, c.note ?? null, i],
      ),
    );

    (p.assets ?? []).forEach((a, i) =>
      db.run("INSERT INTO project_assets (id, project_id, label, location, note, sort) VALUES (?,?,?,?,?,?)", [
        db.uid(),
        projectId,
        a.label,
        a.location,
        a.note ?? null,
        i,
      ]),
    );

    db.run(
      `INSERT INTO activity (id, project_id, entity, action, title, created_at) VALUES (?,?,?,?,?, ${daysAgoSql(startedAgo)})`,
      [db.uid(), projectId, "project", "create", "foi criado"],
    );
    db.run(
      `INSERT INTO activity (id, project_id, entity, action, title, created_at) VALUES (?,?,?,?,?, ${daysAgoSql(p.activityDaysAgo)})`,
      [db.uid(), projectId, "project", "update", "foi atualizado"],
    );

    created += 1;
  });

  for (const name of ["GitHub", "Vercel", "Railway", "Cloudflare", "Claude", "Supabase"]) {
    db.run("UPDATE tools SET favorite = 1 WHERE name = ?", [name]);
  }

  return { created, skipped };
}

export function clearDemo(db: SeedDb): number {
  let removed = 0;
  for (const p of SEED_PROJECTS) {
    const slug = slugify(p.name);
    if (db.get("SELECT 1 FROM projects WHERE slug = ?", [slug])) {
      db.run("DELETE FROM projects WHERE slug = ?", [slug]);
      removed += 1;
    }
  }
  for (const c of SEED_CLIENTS) {
    const slug = slugify(c.name);
    const inUse = db.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM projects p JOIN clients cl ON cl.id = p.client_id WHERE cl.slug = ?",
      [slug],
    );
    if (!inUse || inUse.n === 0) db.run("DELETE FROM clients WHERE slug = ?", [slug]);
  }
  db.run("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM project_tags)");
  return removed;
}

export function demoIsLoaded(db: SeedDb): boolean {
  return Boolean(db.get("SELECT 1 FROM projects WHERE slug = ?", [slugify(SEED_PROJECTS[0].name)]));
}
