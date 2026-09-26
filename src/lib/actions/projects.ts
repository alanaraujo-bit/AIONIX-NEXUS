"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { run, get, all, tx, uid } from "@/lib/db";
import { asAccent, asLinkKind, asPriority, asStage, asStatus, LINK_KIND_META } from "@/lib/domain";
import { logActivity, touchProject } from "@/lib/queries";
import { clamp, normalizeUrl, slugify } from "@/lib/utils";

export interface ActionState {
  error?: string;
  ok?: string;
  slug?: string;
}

const s = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();
const sOrNull = (fd: FormData, key: string): string | null => {
  const v = s(fd, key);
  return v.length > 0 ? v : null;
};
const flag = (fd: FormData, key: string): boolean => {
  const v = fd.get(key);
  return v === "1" || v === "on" || v === "true";
};

function uniqueSlug(base: string, ignoreId?: string): string {
  const root = slugify(base) || "projeto";
  let candidate = root;
  let n = 1;
  while (true) {
    const row = get<{ id: string }>("SELECT id FROM projects WHERE slug = ?", [candidate]);
    if (!row || row.id === ignoreId) return candidate;
    candidate = `${root}-${++n}`;
  }
}

function syncTags(projectId: string, raw: string) {
  const names = [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 24);
  run("DELETE FROM project_tags WHERE project_id = ?", [projectId]);
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    let tag = get<{ id: string }>("SELECT id FROM tags WHERE slug = ?", [slug]);
    if (!tag) {
      const id = uid();
      run("INSERT INTO tags (id, name, slug, color) VALUES (?, ?, ?, 'slate')", [id, name, slug]);
      tag = { id };
    }
    run("INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)", [projectId, tag.id]);
  }
}

function syncTech(projectId: string, raw: string) {
  const names = [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 30);
  run("DELETE FROM project_tech WHERE project_id = ?", [projectId]);
  names.forEach((name, i) => {
    run("INSERT OR IGNORE INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)", [projectId, name, i]);
  });
}

/* ------------------------------------------------------------- criar/editar */

export async function saveProjectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();

  const id = s(fd, "id") || null;
  const name = s(fd, "name");
  if (!name) return { error: "O projeto precisa de um nome." };

  const slug = uniqueSlug(s(fd, "slug") || name, id ?? undefined);
  const categoryId = sOrNull(fd, "category_id");
  const clientId = sOrNull(fd, "client_id");
  const status = asStatus(s(fd, "status"));
  const stage = asStage(s(fd, "stage"));
  const priority = asPriority(s(fd, "priority"));
  const progress = clamp(Number(s(fd, "progress")) || 0, 0, 100);
  const color = asAccent(s(fd, "color"), "indigo");
  const icon = s(fd, "icon") || "Box";

  const fields = {
    name,
    slug,
    codename: sOrNull(fd, "codename"),
    summary: sOrNull(fd, "summary"),
    description: sOrNull(fd, "description"),
    icon,
    color,
    category_id: categoryId,
    client_id: clientId,
    status,
    stage,
    priority,
    progress,
    owner: sOrNull(fd, "owner"),
    domain: sOrNull(fd, "domain"),
    started_at: sOrNull(fd, "started_at"),
    target_at: sOrNull(fd, "target_at"),
    launched_at: sOrNull(fd, "launched_at"),
    notes: sOrNull(fd, "notes"),
  };

  try {
    const projectId = tx(() => {
      if (id) {
        const before = get<{ status: string; name: string }>("SELECT status, name FROM projects WHERE id = ?", [id]);
        if (!before) throw new Error("Projeto não encontrado.");
        run(
          `UPDATE projects SET name=?, slug=?, codename=?, summary=?, description=?, icon=?, color=?,
             category_id=?, client_id=?, status=?, stage=?, priority=?, progress=?, owner=?, domain=?,
             started_at=?, target_at=?, launched_at=?, notes=?,
             updated_at=datetime('now'), last_activity_at=datetime('now')
           WHERE id = ?`,
          [...Object.values(fields), id],
        );
        logActivity({
          projectId: id,
          action: before.status !== status ? "status" : "update",
          title:
            before.status !== status
              ? `mudou para ${status}`
              : "foi atualizado",
        });
        return id;
      }

      const newId = uid();
      run(
        `INSERT INTO projects (id, name, slug, codename, summary, description, icon, color, category_id, client_id,
           status, stage, priority, progress, owner, domain, started_at, target_at, launched_at, notes, sort)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM projects))`,
        [newId, ...Object.values(fields)],
      );
      logActivity({ projectId: newId, action: "create", title: "foi criado" });
      return newId;
    });

    syncTags(projectId, s(fd, "tags"));
    syncTech(projectId, s(fd, "tech"));

    revalidatePath("/", "layout");
    if (!id) redirect(`/projetos/${slug}?novo=1`);
    return { ok: "Projeto salvo.", slug };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect
    return { error: err instanceof Error ? err.message : "Não foi possível salvar." };
  }
}

/* ------------------------------------------------------------ ações rápidas */

export async function setProjectFieldAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const field = s(fd, "field");
  const value = s(fd, "value");
  if (!id) return;

  const allowed: Record<string, (v: string) => unknown> = {
    status: (v) => asStatus(v),
    stage: (v) => asStage(v),
    priority: (v) => asPriority(v),
    progress: (v) => clamp(Number(v) || 0, 0, 100),
    is_favorite: (v) => (v === "1" ? 1 : 0),
    is_pinned: (v) => (v === "1" ? 1 : 0),
    is_archived: (v) => (v === "1" ? 1 : 0),
  };
  const cast = allowed[field];
  if (!cast) return;

  run(`UPDATE projects SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [cast(value), id]);

  if (field === "status" || field === "priority" || field === "stage" || field === "progress") {
    touchProject(id);
    logActivity({ projectId: id, action: field === "status" ? "status" : "update", title: labelFor(field, value) });
  }
  if (field === "is_archived") {
    logActivity({ projectId: id, action: "archive", title: value === "1" ? "foi arquivado" : "saiu do arquivo" });
  }

  revalidatePath("/", "layout");
}

function labelFor(field: string, value: string): string {
  if (field === "status") return `mudou para ${value}`;
  if (field === "priority") return `teve prioridade definida como ${value}`;
  if (field === "stage") return `avançou para o estágio ${value}`;
  return `teve progresso ajustado para ${value}%`;
}

export async function toggleProjectFlagAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const field = s(fd, "field");
  if (!id || !["is_favorite", "is_pinned", "is_archived"].includes(field)) return;
  run(`UPDATE projects SET ${field} = 1 - ${field}, updated_at = datetime('now') WHERE id = ?`, [id]);
  revalidatePath("/", "layout");
}

export async function deleteProjectAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const row = get<{ name: string }>("SELECT name FROM projects WHERE id = ?", [id]);
  if (!row) return;
  run("DELETE FROM projects WHERE id = ?", [id]);
  logActivity({ projectId: null, entity: "project", action: "delete", title: `Projeto “${row.name}” foi excluído` });
  revalidatePath("/", "layout");
  redirect("/projetos");
}

export async function duplicateProjectAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const src = get<Record<string, unknown>>("SELECT * FROM projects WHERE id = ?", [id]);
  if (!src) return;

  const newId = uid();
  const newName = `${String(src.name)} (cópia)`;
  const newSlug = uniqueSlug(newName);

  tx(() => {
    run(
      `INSERT INTO projects (id, name, slug, codename, summary, description, icon, color, category_id, client_id,
         status, stage, priority, progress, owner, domain, started_at, target_at, launched_at, notes, sort)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM projects))`,
      [
        newId,
        newName,
        newSlug,
        src.codename ?? null,
        src.summary ?? null,
        src.description ?? null,
        src.icon ?? "Box",
        src.color ?? "indigo",
        src.category_id ?? null,
        src.client_id ?? null,
        "idea",
        src.stage ?? "build",
        src.priority ?? "medium",
        0,
        src.owner ?? null,
        null,
        null,
        null,
        null,
        src.notes ?? null,
      ],
    );

    for (const l of all<Record<string, unknown>>("SELECT * FROM project_links WHERE project_id = ?", [id])) {
      run(
        "INSERT INTO project_links (id, project_id, kind, label, url, note, sort, is_primary, monitor) VALUES (?,?,?,?,?,?,?,?,?)",
        [uid(), newId, l.kind, l.label, l.url, l.note ?? null, l.sort ?? 0, l.is_primary ?? 0, l.monitor ?? 1],
      );
    }
    for (const t of all<{ name: string; sort: number }>("SELECT name, sort FROM project_tech WHERE project_id = ?", [id])) {
      run("INSERT OR IGNORE INTO project_tech (project_id, name, sort) VALUES (?,?,?)", [newId, t.name, t.sort]);
    }
    for (const t of all<{ tag_id: string }>("SELECT tag_id FROM project_tags WHERE project_id = ?", [id])) {
      run("INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?,?)", [newId, t.tag_id]);
    }
    for (const c of all<Record<string, unknown>>("SELECT * FROM project_credentials WHERE project_id = ?", [id])) {
      run(
        "INSERT INTO project_credentials (id, project_id, label, vault, identifier, url, note, sort) VALUES (?,?,?,?,?,?,?,?)",
        [uid(), newId, c.label, c.vault ?? null, c.identifier ?? null, c.url ?? null, c.note ?? null, c.sort ?? 0],
      );
    }
    logActivity({ projectId: newId, action: "duplicate", title: `foi duplicado de “${String(src.name)}”` });
  });

  revalidatePath("/", "layout");
  redirect(`/projetos/${newSlug}`);
}

/* -------------------------------------------------------------------- links */

export async function saveLinkAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = s(fd, "project_id");
  const id = s(fd, "id");
  const kind = asLinkKind(s(fd, "kind"));
  const url = normalizeUrl(s(fd, "url"));
  const label = s(fd, "label") || LINK_KIND_META[kind].label;
  const note = sOrNull(fd, "note");
  const monitor = flag(fd, "monitor");

  if (!projectId) return { error: "Projeto inválido." };
  if (!url) return { error: "Informe a URL." };
  try {
    new URL(url);
  } catch {
    return { error: "URL inválida." };
  }

  if (id) {
    run("UPDATE project_links SET kind=?, label=?, url=?, note=?, monitor=?, last_status=NULL, last_checked_at=NULL, last_error=NULL WHERE id = ? AND project_id = ?", [
      kind,
      label,
      url,
      note,
      monitor ? 1 : 0,
      id,
      projectId,
    ]);
    logActivity({ projectId, action: "link", title: `teve o link “${label}” atualizado` });
  } else {
    run(
      `INSERT INTO project_links (id, project_id, kind, label, url, note, monitor, sort)
       VALUES (?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM project_links WHERE project_id = ?))`,
      [uid(), projectId, kind, label, url, note, monitor ? 1 : 0, projectId],
    );
    logActivity({ projectId, action: "link", title: `ganhou o link “${label}”`, detail: url });
  }
  touchProject(projectId);
  revalidatePath("/", "layout");
  return { ok: "Link salvo." };
}

export async function deleteLinkAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const row = get<{ project_id: string; label: string }>("SELECT project_id, label FROM project_links WHERE id = ?", [id]);
  if (!row) return;
  run("DELETE FROM project_links WHERE id = ?", [id]);
  logActivity({ projectId: row.project_id, action: "link", title: `perdeu o link “${row.label}”` });
  revalidatePath("/", "layout");
}

export async function setPrimaryLinkAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const row = get<{ project_id: string }>("SELECT project_id FROM project_links WHERE id = ?", [id]);
  if (!row) return;
  run("UPDATE project_links SET is_primary = 0 WHERE project_id = ?", [row.project_id]);
  run("UPDATE project_links SET is_primary = 1 WHERE id = ?", [id]);
  revalidatePath("/", "layout");
}

export async function moveLinkAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const dir = s(fd, "dir") === "up" ? -1 : 1;
  const row = get<{ project_id: string; sort: number }>("SELECT project_id, sort FROM project_links WHERE id = ?", [id]);
  if (!row) return;
  const neighbour = get<{ id: string; sort: number }>(
    dir === -1
      ? "SELECT id, sort FROM project_links WHERE project_id = ? AND sort < ? ORDER BY sort DESC LIMIT 1"
      : "SELECT id, sort FROM project_links WHERE project_id = ? AND sort > ? ORDER BY sort ASC LIMIT 1",
    [row.project_id, row.sort],
  );
  if (!neighbour) return;
  run("UPDATE project_links SET sort = ? WHERE id = ?", [neighbour.sort, id]);
  run("UPDATE project_links SET sort = ? WHERE id = ?", [row.sort, neighbour.id]);
  revalidatePath("/", "layout");
}

/* ----------------------------------------------------------- próximos passos */

export async function addStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = s(fd, "project_id");
  const title = s(fd, "title");
  const due = sOrNull(fd, "due_at");
  if (!projectId || !title) return { error: "Descreva o próximo passo." };

  run(
    `INSERT INTO project_steps (id, project_id, title, due_at, sort)
     VALUES (?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM project_steps WHERE project_id = ?))`,
    [uid(), projectId, title, due, projectId],
  );
  touchProject(projectId);
  logActivity({ projectId, action: "step", title: `ganhou o passo “${title}”` });
  revalidatePath("/", "layout");
  return { ok: "Passo adicionado." };
}

export async function toggleStepAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const row = get<{ project_id: string; done: number; title: string }>(
    "SELECT project_id, done, title FROM project_steps WHERE id = ?",
    [id],
  );
  if (!row) return;
  const next = row.done ? 0 : 1;
  run("UPDATE project_steps SET done = ?, done_at = ? WHERE id = ?", [
    next,
    next ? new Date().toISOString() : null,
    id,
  ]);
  touchProject(row.project_id);
  if (next) logActivity({ projectId: row.project_id, action: "step", title: `concluiu “${row.title}”` });
  revalidatePath("/", "layout");
}

export async function deleteStepAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  run("DELETE FROM project_steps WHERE id = ?", [id]);
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------- credenciais */

export async function saveCredentialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = s(fd, "project_id");
  const id = s(fd, "id");
  const label = s(fd, "label");
  if (!projectId || !label) return { error: "Dê um nome à referência." };

  const vault = sOrNull(fd, "vault");
  const identifier = sOrNull(fd, "identifier");
  const url = sOrNull(fd, "url");
  const note = sOrNull(fd, "note");
  const rotated = sOrNull(fd, "rotated_at");

  if (id) {
    run("UPDATE project_credentials SET label=?, vault=?, identifier=?, url=?, note=?, rotated_at=? WHERE id=? AND project_id=?", [
      label, vault, identifier, url ? normalizeUrl(url) : null, note, rotated, id, projectId,
    ]);
  } else {
    run(
      `INSERT INTO project_credentials (id, project_id, label, vault, identifier, url, note, rotated_at, sort)
       VALUES (?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM project_credentials WHERE project_id = ?))`,
      [uid(), projectId, label, vault, identifier, url ? normalizeUrl(url) : null, note, rotated, projectId],
    );
  }
  revalidatePath("/", "layout");
  return { ok: "Referência salva." };
}

export async function deleteCredentialAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM project_credentials WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------- notas */

export async function saveNoteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const id = s(fd, "id");
  const projectId = sOrNull(fd, "project_id");
  const title = sOrNull(fd, "title");
  const body = s(fd, "body");
  if (!body) return { error: "A nota está vazia." };

  if (id) {
    run("UPDATE notes SET title=?, body=?, project_id=?, updated_at=datetime('now') WHERE id=?", [
      title, body, projectId, id,
    ]);
  } else {
    run("INSERT INTO notes (id, project_id, title, body) VALUES (?,?,?,?)", [uid(), projectId, title, body]);
    if (projectId) logActivity({ projectId, action: "note", title: "recebeu uma nota" });
  }
  if (projectId) touchProject(projectId);
  revalidatePath("/", "layout");
  return { ok: "Nota salva." };
}

export async function toggleNotePinAction(fd: FormData) {
  await requireUser();
  run("UPDATE notes SET pinned = 1 - pinned WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

export async function deleteNoteAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM notes WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------- anexos */

export async function saveAssetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const projectId = s(fd, "project_id");
  const id = s(fd, "id");
  const label = s(fd, "label");
  const location = s(fd, "location");
  if (!projectId || !label || !location) return { error: "Informe nome e localização." };

  if (id) {
    run("UPDATE project_assets SET label=?, location=?, kind=?, note=? WHERE id=? AND project_id=?", [
      label, location, s(fd, "kind") || "file", sOrNull(fd, "note"), id, projectId,
    ]);
  } else {
    run(
      `INSERT INTO project_assets (id, project_id, label, location, kind, note, sort)
       VALUES (?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM project_assets WHERE project_id = ?))`,
      [uid(), projectId, label, location, s(fd, "kind") || "file", sOrNull(fd, "note"), projectId],
    );
  }
  revalidatePath("/", "layout");
  return { ok: "Referência salva." };
}

export async function deleteAssetAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM project_assets WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}
