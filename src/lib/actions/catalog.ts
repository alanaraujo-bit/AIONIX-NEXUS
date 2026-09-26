"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { get, run, setSetting, uid } from "@/lib/db";
import { asAccent } from "@/lib/domain";
import { logActivity } from "@/lib/queries";
import { normalizeUrl, slugify } from "@/lib/utils";

export interface ActionState {
  error?: string;
  ok?: string;
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const sOrNull = (fd: FormData, k: string) => {
  const v = s(fd, k);
  return v ? v : null;
};
const flag = (fd: FormData, k: string) => ["1", "on", "true"].includes(String(fd.get(k) ?? ""));

function uniqueSlug(table: string, base: string, ignoreId?: string): string {
  const root = slugify(base) || "item";
  let candidate = root;
  let n = 1;
  while (true) {
    const row = get<{ id: string }>(`SELECT id FROM ${table} WHERE slug = ?`, [candidate]);
    if (!row || row.id === ignoreId) return candidate;
    candidate = `${root}-${++n}`;
  }
}

/* ------------------------------------------------------------- categorias */

export async function saveCategoryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const id = s(fd, "id");
  const name = s(fd, "name");
  if (!name) return { error: "Informe o nome da categoria." };

  const slug = uniqueSlug("categories", s(fd, "slug") || name, id || undefined);
  const icon = s(fd, "icon") || "Layers";
  const color = asAccent(s(fd, "color"));
  const descricao = sOrNull(fd, "descricao");

  if (id) {
    run("UPDATE categories SET name=?, slug=?, icon=?, color=?, descricao=? WHERE id=?", [
      name, slug, icon, color, descricao, id,
    ]);
  } else {
    run(
      "INSERT INTO categories (id, name, slug, icon, color, descricao, sort) VALUES (?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM categories))",
      [uid(), name, slug, icon, color, descricao],
    );
  }
  revalidatePath("/", "layout");
  return { ok: "Categoria salva." };
}

export async function deleteCategoryAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM categories WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

export async function moveCatalogAction(fd: FormData) {
  await requireUser();
  const table = s(fd, "table");
  if (!["categories", "clients", "tools", "tool_groups"].includes(table)) return;
  const id = s(fd, "id");
  const dir = s(fd, "dir") === "up" ? -1 : 1;

  const row = get<{ sort: number }>(`SELECT sort FROM ${table} WHERE id = ?`, [id]);
  if (!row) return;
  const neighbour = get<{ id: string; sort: number }>(
    dir === -1
      ? `SELECT id, sort FROM ${table} WHERE sort < ? ORDER BY sort DESC LIMIT 1`
      : `SELECT id, sort FROM ${table} WHERE sort > ? ORDER BY sort ASC LIMIT 1`,
    [row.sort],
  );
  if (!neighbour) return;
  run(`UPDATE ${table} SET sort = ? WHERE id = ?`, [neighbour.sort, id]);
  run(`UPDATE ${table} SET sort = ? WHERE id = ?`, [row.sort, neighbour.id]);
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------- clientes */

export async function saveClientAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const id = s(fd, "id");
  const name = s(fd, "name");
  if (!name) return { error: "Informe o nome do cliente." };

  const slug = uniqueSlug("clients", s(fd, "slug") || name, id || undefined);
  const website = s(fd, "website") ? normalizeUrl(s(fd, "website")) : null;

  const values = [
    name,
    slug,
    sOrNull(fd, "company"),
    sOrNull(fd, "contact"),
    sOrNull(fd, "email"),
    sOrNull(fd, "phone"),
    website,
    sOrNull(fd, "notes"),
    asAccent(s(fd, "color")),
    s(fd, "icon") || "Building2",
    flag(fd, "archived") ? 1 : 0,
  ];

  if (id) {
    run(
      `UPDATE clients SET name=?, slug=?, company=?, contact=?, email=?, phone=?, website=?, notes=?, color=?, icon=?, archived=?, updated_at=datetime('now') WHERE id=?`,
      [...values, id],
    );
  } else {
    run(
      `INSERT INTO clients (id, name, slug, company, contact, email, phone, website, notes, color, icon, archived, sort)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM clients))`,
      [uid(), ...values],
    );
  }
  revalidatePath("/", "layout");
  return { ok: "Cliente salvo." };
}

export async function deleteClientAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM clients WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------- tags */

export async function saveTagAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const id = s(fd, "id");
  const name = s(fd, "name");
  if (!name) return { error: "Informe o nome da tag." };
  const slug = uniqueSlug("tags", s(fd, "slug") || name, id || undefined);
  const color = asAccent(s(fd, "color"));

  if (id) {
    run("UPDATE tags SET name=?, slug=?, color=? WHERE id=?", [name, slug, color, id]);
  } else {
    run("INSERT INTO tags (id, name, slug, color) VALUES (?,?,?,?)", [uid(), name, slug, color]);
  }
  revalidatePath("/", "layout");
  return { ok: "Tag salva." };
}

export async function deleteTagAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM tags WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------- ferramentas */

export async function saveToolAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const id = s(fd, "id");
  const name = s(fd, "name");
  const url = normalizeUrl(s(fd, "url"));
  if (!name) return { error: "Informe o nome da ferramenta." };
  if (!url) return { error: "Informe a URL." };
  try {
    new URL(url);
  } catch {
    return { error: "URL inválida." };
  }

  const values = [
    sOrNull(fd, "group_id"),
    name,
    url,
    sOrNull(fd, "subtitle"),
    s(fd, "icon") || "ExternalLink",
    asAccent(s(fd, "color")),
    flag(fd, "favorite") ? 1 : 0,
  ];

  if (id) {
    run("UPDATE tools SET group_id=?, name=?, url=?, subtitle=?, icon=?, color=?, favorite=? WHERE id=?", [...values, id]);
  } else {
    run(
      `INSERT INTO tools (id, group_id, name, url, subtitle, icon, color, favorite, sort)
       VALUES (?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM tools))`,
      [uid(), ...values],
    );
  }
  revalidatePath("/", "layout");
  return { ok: "Ferramenta salva." };
}

export async function deleteToolAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM tools WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

export async function toggleToolFavoriteAction(fd: FormData) {
  await requireUser();
  run("UPDATE tools SET favorite = 1 - favorite WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

export async function registerToolOpenAction(fd: FormData) {
  await requireUser();
  run("UPDATE tools SET opens = opens + 1 WHERE id = ?", [s(fd, "id")]);
}

export async function saveToolGroupAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const id = s(fd, "id");
  const name = s(fd, "name");
  if (!name) return { error: "Informe o nome do grupo." };
  const icon = s(fd, "icon") || "Grid2x2";
  if (id) {
    run("UPDATE tool_groups SET name=?, icon=? WHERE id=?", [name, icon, id]);
  } else {
    run("INSERT INTO tool_groups (id, name, icon, sort) VALUES (?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM tool_groups))", [
      uid(),
      name,
      icon,
    ]);
  }
  revalidatePath("/", "layout");
  return { ok: "Grupo salvo." };
}

export async function deleteToolGroupAction(fd: FormData) {
  await requireUser();
  run("DELETE FROM tool_groups WHERE id = ?", [s(fd, "id")]);
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------- settings */

export async function saveSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  for (const key of ["owner_name", "org_name", "default_view", "density", "home_greeting"]) {
    const value = s(fd, key);
    if (value) setSetting(key, value);
  }
  revalidatePath("/", "layout");
  return { ok: "Preferências salvas." };
}

/* -------------------------------------------------------------- manutenção */

export async function clearActivityAction() {
  await requireUser();
  run("DELETE FROM activity");
  revalidatePath("/", "layout");
}

export async function resetDataAction(fd: FormData) {
  await requireUser();
  if (s(fd, "confirm") !== "APAGAR") return;
  for (const t of [
    "project_tags",
    "project_tech",
    "project_links",
    "project_steps",
    "project_credentials",
    "project_assets",
    "notes",
    "activity",
    "projects",
    "clients",
    "tags",
  ]) {
    run(`DELETE FROM ${t}`);
  }
  logActivity({ action: "delete", entity: "system", title: "Todos os projetos foram apagados" });
  revalidatePath("/", "layout");
}
