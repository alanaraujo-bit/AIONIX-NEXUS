"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { logActivity } from "@/lib/queries";

interface CheckRow {
  id: string;
  url: string;
  project_id: string;
  label: string;
}

const TIMEOUT_MS = 8000;

/** `fetch` só diz "fetch failed"; o motivo real vem no `cause`. */
function describeFailure(err: unknown): string {
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return "tempo esgotado";
  const cause = (err as { cause?: { code?: string } } | undefined)?.cause;
  switch (cause?.code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "domínio não resolve";
    case "ECONNREFUSED":
      return "conexão recusada";
    case "ECONNRESET":
      return "conexão interrompida";
    case "ETIMEDOUT":
    case "UND_ERR_CONNECT_TIMEOUT":
      return "tempo esgotado";
    case "CERT_HAS_EXPIRED":
      return "certificado expirado";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      return "certificado inválido";
    default:
      return cause?.code ? cause.code.toLowerCase() : "falha de rede";
  }
}

/**
 * Verifica se um link responde. Usa HEAD e cai para GET quando o servidor
 * não aceita HEAD. Nunca segue conteúdo — só interessa o código.
 */
async function probe(url: string): Promise<{ status: number; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const init: RequestInit = {
    redirect: "follow",
    signal: controller.signal,
    headers: { "user-agent": "AIONIX-NEXUS/1.0 (link check)" },
    cache: "no-store",
  };

  try {
    let res = await fetch(url, { ...init, method: "HEAD" });
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetch(url, { ...init, method: "GET" });
    }
    return { status: res.status, error: null };
  } catch (err) {
    return { status: 0, error: describeFailure(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function checkRows(rows: CheckRow[]) {
  const CONCURRENCY = 6;
  let cursor = 0;
  let broken = 0;

  async function worker() {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      const { status, error } = await probe(row.url);
      await run("UPDATE project_links SET last_status = ?, last_error = ?, last_checked_at = datetime('now') WHERE id = ?", [
        status,
        error,
        row.id,
      ]);
      if (status === 0 || status >= 400) broken += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
  return broken;
}

export async function checkProjectLinksAction(formData: FormData) {
  await requireUser();
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const rows = await all<CheckRow>(
    "SELECT id, url, project_id, label FROM project_links WHERE project_id = ? AND monitor = 1",
    [projectId],
  );
  const broken = await checkRows(rows);
  await logActivity({
    projectId,
    action: "check",
    title: `teve ${rows.length} link${rows.length === 1 ? "" : "s"} verificado${rows.length === 1 ? "" : "s"}`,
    detail: broken > 0 ? `${broken} com problema` : "todos responderam",
  });
  revalidatePath("/", "layout");
}

export async function checkAllLinksAction() {
  await requireUser();
  const rows = await all<CheckRow>(
    `SELECT l.id, l.url, l.project_id, l.label FROM project_links l
     JOIN projects p ON p.id = l.project_id
     WHERE l.monitor = 1 AND p.is_archived = 0`,
  );
  const broken = await checkRows(rows);
  await logActivity({
    entity: "system",
    action: "check",
    title: `Verificação geral: ${rows.length} links`,
    detail: broken > 0 ? `${broken} com problema` : "todos responderam",
  });
  revalidatePath("/", "layout");
}

export async function checkSingleLinkAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const rows = await all<CheckRow>("SELECT id, url, project_id, label FROM project_links WHERE id = ?", [id]);
  await checkRows(rows);
  revalidatePath("/", "layout");
}
