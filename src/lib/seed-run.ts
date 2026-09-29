/**
 * Semeadura do portfólio de demonstração, escrita contra uma interface mínima
 * de banco para servir tanto à server action quanto ao script `npm run db:seed`.
 */

import { LINK_KIND_META } from "./domain.ts";
import { SEED_CLIENTS, SEED_PROJECTS, SEED_TAGS } from "./seed-data.ts";
import { slugify } from "./utils.ts";

export interface SeedDb {
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<unknown>;
  uid(): string;
}

const daysAgoSql = (n: number) => `datetime('now', '-${Math.max(0, Math.round(n))} days')`;
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const isoInDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export async function seedDemo(db: SeedDb): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  const clientIds = new Map<string, string>();
  for (const [i, c] of SEED_CLIENTS.entries()) {
    const slug = slugify(c.name);
    let row = await db.get<{ id: string }>("SELECT id FROM clients WHERE slug = ?", [slug]);
    if (!row) {
      const id = db.uid();
      await db.run(
        "INSERT INTO clients (id, name, slug, company, contact, email, website, notes, color, icon, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [id, c.name, slug, c.company ?? null, c.contact ?? null, c.email ?? null, c.website ?? null, c.notes ?? null, c.color, c.icon, i],
      );
      row = { id };
    }
    clientIds.set(c.name, row.id);
  }

  const tagIds = new Map<string, string>();
  for (const t of SEED_TAGS) {
    const slug = slugify(t.name);
    let row = await db.get<{ id: string }>("SELECT id FROM tags WHERE slug = ?", [slug]);
    if (!row) {
      const id = db.uid();
      await db.run("INSERT INTO tags (id, name, slug, color) VALUES (?,?,?,?)", [id, t.name, slug, t.color]);
      row = { id };
    }
    tagIds.set(t.name, row.id);
  }

  for (const [index, p] of SEED_PROJECTS.entries()) {
    const slug = slugify(p.name);
    if (await db.get("SELECT 1 FROM projects WHERE slug = ?", [slug])) {
      skipped += 1;
      continue;
    }

    const categoryId =
      (await db.get<{ id: string }>("SELECT id FROM categories WHERE slug = ?", [p.category]))?.id ?? null;
    const projectId = db.uid();
    const startedAgo = p.startedDaysAgo ?? p.activityDaysAgo;

    await db.run(
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

    for (const [i, name] of p.tech.entries()) {
      await db.run("INSERT INTO project_tech (project_id, name, sort) VALUES (?,?,?) ON CONFLICT DO NOTHING", [
        projectId,
        name,
        i,
      ]);
    }

    for (const tag of p.tags) {
      const tid = tagIds.get(tag);
      if (tid) {
        await db.run("INSERT INTO project_tags (project_id, tag_id) VALUES (?,?) ON CONFLICT DO NOTHING", [
          projectId,
          tid,
        ]);
      }
    }

    for (const [i, l] of p.links.entries()) {
      await db.run(
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
      );
    }

    for (const [i, st] of p.steps.entries()) {
      await db.run("INSERT INTO project_steps (id, project_id, title, done, due_at, sort, done_at) VALUES (?,?,?,?,?,?,?)", [
        db.uid(),
        projectId,
        st.title,
        st.done ? 1 : 0,
        st.dueInDays === undefined ? null : isoInDays(st.dueInDays),
        i,
        st.done ? new Date().toISOString() : null,
      ]);
    }

    for (const n of p.notes ?? []) {
      await db.run("INSERT INTO notes (id, project_id, title, body, pinned) VALUES (?,?,?,?,?)", [
        db.uid(),
        projectId,
        n.title ?? null,
        n.body,
        n.pinned ? 1 : 0,
      ]);
    }

    for (const [i, c] of (p.credentials ?? []).entries()) {
      await db.run(
        "INSERT INTO project_credentials (id, project_id, label, vault, identifier, url, note, sort) VALUES (?,?,?,?,?,?,?,?)",
        [db.uid(), projectId, c.label, c.vault ?? null, c.identifier ?? null, c.url ?? null, c.note ?? null, i],
      );
    }

    for (const [i, a] of (p.assets ?? []).entries()) {
      await db.run("INSERT INTO project_assets (id, project_id, label, location, note, sort) VALUES (?,?,?,?,?,?)", [
        db.uid(),
        projectId,
        a.label,
        a.location,
        a.note ?? null,
        i,
      ]);
    }

    await db.run(
      `INSERT INTO activity (id, project_id, entity, action, title, created_at) VALUES (?,?,?,?,?, ${daysAgoSql(startedAgo)})`,
      [db.uid(), projectId, "project", "create", "foi criado"],
    );
    await db.run(
      `INSERT INTO activity (id, project_id, entity, action, title, created_at) VALUES (?,?,?,?,?, ${daysAgoSql(p.activityDaysAgo)})`,
      [db.uid(), projectId, "project", "update", "foi atualizado"],
    );

    created += 1;
  }

  for (const name of ["GitHub", "Vercel", "Railway", "Cloudflare", "Claude", "Supabase"]) {
    await db.run("UPDATE tools SET favorite = 1 WHERE name = ?", [name]);
  }

  return { created, skipped };
}

export async function clearDemo(db: SeedDb): Promise<number> {
  let removed = 0;
  for (const p of SEED_PROJECTS) {
    const slug = slugify(p.name);
    if (await db.get("SELECT 1 FROM projects WHERE slug = ?", [slug])) {
      await db.run("DELETE FROM projects WHERE slug = ?", [slug]);
      removed += 1;
    }
  }
  for (const c of SEED_CLIENTS) {
    const slug = slugify(c.name);
    const inUse = await db.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM projects p JOIN clients cl ON cl.id = p.client_id WHERE cl.slug = ?",
      [slug],
    );
    if (!inUse || inUse.n === 0) await db.run("DELETE FROM clients WHERE slug = ?", [slug]);
  }
  await db.run("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM project_tags)");
  return removed;
}

export async function demoIsLoaded(db: SeedDb): Promise<boolean> {
  return Boolean(await db.get("SELECT 1 FROM projects WHERE slug = ?", [slugify(SEED_PROJECTS[0].name)]));
}
