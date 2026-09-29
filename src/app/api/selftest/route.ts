import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { get, run } from "@/lib/db";
import {
  addStepAction,
  deleteProjectAction,
  duplicateProjectAction,
  saveCredentialAction,
  saveLinkAction,
  saveNoteAction,
  saveProjectAction,
  setProjectFieldAction,
  toggleProjectFlagAction,
  toggleStepAction,
} from "@/lib/actions/projects";
import { saveCategoryAction, saveTagAction, saveToolAction, deleteCategoryAction, deleteToolAction } from "@/lib/actions/catalog";
import { checkProjectLinksAction } from "@/lib/actions/links";

/**
 * Rota de verificação usada durante o desenvolvimento para exercitar as
 * escritas de ponta a ponta. Só existe fora de produção.
 */
export const dynamic = "force-dynamic";

const fd = (obj: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
};

/** Server actions sinalizam navegação lançando NEXT_REDIRECT; aqui isso é sucesso. */
async function tolerateRedirect<T>(fn: () => Promise<T>): Promise<T | "redirect"> {
  try {
    return await fn();
  } catch (err) {
    const digest = (err as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return "redirect";
    throw err;
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "indisponível em produção" }, { status: 404 });
  }
  if (!(await currentUser())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const steps: Array<{ step: string; ok: boolean; detail?: string }> = [];
  const check = (step: string, ok: boolean, detail?: string) => steps.push({ step, ok, detail });
  const slug = `selftest-${Date.now().toString(36)}`;

  try {
    // --- criar -------------------------------------------------------------
    await tolerateRedirect(() =>
      saveProjectAction(
        {},
        fd({
          name: "Projeto de verificação",
          slug,
          summary: "Criado pelo autoteste",
          description: "linha 1",
          icon: "Rocket",
          color: "cyan",
          status: "development",
          stage: "build",
          priority: "high",
          progress: "25",
          owner: "Autoteste",
          domain: "verificacao.exemplo.com",
          tags: "autoteste, temporaria",
          tech: "Next.js, SQLite",
          notes: "nota inicial",
        }),
      ),
    );
    const created = await get<{ id: string; name: string; progress: number; color: string; owner: string }>(
      "SELECT id, name, progress, color, owner FROM projects WHERE slug = ?",
      [slug],
    );
    check("criar projeto", Boolean(created), created ? `id=${created.id.slice(0, 8)}` : "não encontrado");
    if (!created) throw new Error("projeto não foi criado");
    check(
      "colunas alinhadas no INSERT",
      created.progress === 25 && created.color === "cyan" && created.owner === "Autoteste",
      `progress=${created.progress} color=${created.color} owner=${created.owner}`,
    );

    const tagCount = await get<{ n: number }>("SELECT COUNT(*) AS n FROM project_tags WHERE project_id = ?", [created.id]);
    check("tags sincronizadas", tagCount?.n === 2, `n=${tagCount?.n}`);
    const techCount = await get<{ n: number }>("SELECT COUNT(*) AS n FROM project_tech WHERE project_id = ?", [created.id]);
    check("tecnologias sincronizadas", techCount?.n === 2, `n=${techCount?.n}`);

    // --- editar ------------------------------------------------------------
    await tolerateRedirect(() =>
      saveProjectAction(
        {},
        fd({
          id: created.id,
          name: "Projeto de verificação (editado)",
          slug,
          icon: "Rocket",
          color: "emerald",
          status: "active",
          stage: "launched",
          priority: "critical",
          progress: "80",
          tags: "autoteste",
          tech: "Next.js",
        }),
      ),
    );
    const edited = await get<{ name: string; status: string; progress: number; color: string }>(
      "SELECT name, status, progress, color FROM projects WHERE id = ?",
      [created.id],
    );
    check(
      "editar projeto",
      edited?.status === "active" && edited.progress === 80 && edited.color === "emerald",
      JSON.stringify(edited),
    );
    const tagsAfter = await get<{ n: number }>("SELECT COUNT(*) AS n FROM project_tags WHERE project_id = ?", [created.id]);
    check("tags re-sincronizadas", tagsAfter?.n === 1, `n=${tagsAfter?.n}`);

    // --- links -------------------------------------------------------------
    await saveLinkAction({}, fd({ project_id: created.id, kind: "production", url: "exemplo.com", label: "", monitor: "1" }));
    const link = await get<{ id: string; url: string; label: string; monitor: number }>(
      "SELECT id, url, label, monitor FROM project_links WHERE project_id = ?",
      [created.id],
    );
    check("criar link com URL normalizada", link?.url === "https://exemplo.com", link?.url);
    check("rótulo padrão pelo tipo", link?.label === "Produção", link?.label);

    const bad = await saveLinkAction({}, fd({ project_id: created.id, kind: "repo", url: "não é url", label: "x" }));
    check("URL inválida é recusada", Boolean(bad.error), bad.error);

    // --- passos ------------------------------------------------------------
    await addStepAction({}, fd({ project_id: created.id, title: "Passo de verificação", due_at: "2030-01-01" }));
    const step = await get<{ id: string; done: number }>("SELECT id, done FROM project_steps WHERE project_id = ?", [created.id]);
    check("criar próximo passo", Boolean(step), step?.id?.slice(0, 8));
    if (step) {
      await toggleStepAction(fd({ id: step.id }));
      const done = await get<{ done: number; done_at: string | null }>("SELECT done, done_at FROM project_steps WHERE id = ?", [step.id]);
      check("concluir passo", done?.done === 1 && Boolean(done.done_at), `done=${done?.done}`);
    }

    // --- nota e credencial -------------------------------------------------
    await saveNoteAction({}, fd({ project_id: created.id, title: "Nota", body: "corpo da nota" }));
    check("criar nota", Boolean(await get("SELECT 1 FROM notes WHERE project_id = ?", [created.id])));

    await saveCredentialAction({}, fd({ project_id: created.id, label: "Cofre", vault: "1Password", identifier: "a@b.c" }));
    check("criar referência de credencial", Boolean(await get("SELECT 1 FROM project_credentials WHERE project_id = ?", [created.id])));

    // --- campos rápidos ----------------------------------------------------
    await setProjectFieldAction(fd({ id: created.id, field: "status", value: "paused" }));
    check(
      "alterar status",
      (await get<{ status: string }>("SELECT status FROM projects WHERE id = ?", [created.id]))?.status === "paused",
    );

    await setProjectFieldAction(fd({ id: created.id, field: "status", value: "valor-invalido" }));
    check(
      "status inválido cai no padrão seguro",
      (await get<{ status: string }>("SELECT status FROM projects WHERE id = ?", [created.id]))?.status === "development",
    );

    await toggleProjectFlagAction(fd({ id: created.id, field: "is_pinned" }));
    check(
      "fixar projeto",
      (await get<{ v: number }>("SELECT is_pinned AS v FROM projects WHERE id = ?", [created.id]))?.v === 1,
    );
    await toggleProjectFlagAction(fd({ id: created.id, field: "is_pinned" }));
    check(
      "desafixar projeto",
      (await get<{ v: number }>("SELECT is_pinned AS v FROM projects WHERE id = ?", [created.id]))?.v === 0,
    );

    await toggleProjectFlagAction(fd({ id: created.id, field: "coluna_invalida" }));
    check("campo não permitido é ignorado", true);

    // --- duplicar ----------------------------------------------------------
    await tolerateRedirect(() => duplicateProjectAction(fd({ id: created.id })));
    const copy = await get<{ id: string; status: string; progress: number }>(
      "SELECT id, status, progress FROM projects WHERE slug = ?",
      [`${slug}-copia`],
    ) ?? (await get<{ id: string; status: string; progress: number }>(
      "SELECT id, status, progress FROM projects WHERE name LIKE '%(cópia)' ORDER BY created_at DESC LIMIT 1",
    ));
    check("duplicar projeto", Boolean(copy), copy?.id?.slice(0, 8));
    check("cópia volta para ideia e progresso zero", copy?.status === "idea" && copy.progress === 0, JSON.stringify(copy));
    const copyLinks = copy
      ? await get<{ n: number }>("SELECT COUNT(*) AS n FROM project_links WHERE project_id = ?", [copy.id])
      : undefined;
    check("links copiados", (copyLinks?.n ?? 0) >= 1, `n=${copyLinks?.n}`);

    // --- verificação de link ----------------------------------------------
    await saveLinkAction(
      {},
      fd({ project_id: created.id, kind: "service", url: "https://github.com", label: "Sonda", monitor: "1" }),
    );
    await checkProjectLinksAction(fd({ project_id: created.id }));
    const probed = await get<{ last_status: number | null; last_checked_at: string | null }>(
      "SELECT last_status, last_checked_at FROM project_links WHERE project_id = ? AND label = 'Sonda'",
      [created.id],
    );
    check(
      "verificar link que responde",
      probed?.last_status === 200 && Boolean(probed.last_checked_at),
      `status=${probed?.last_status}`,
    );
    const unreachable = await get<{ last_status: number | null; last_error: string | null }>(
      "SELECT last_status, last_error FROM project_links WHERE project_id = ? AND url = 'https://exemplo.com'",
      [created.id],
    );
    check(
      "link inalcançável recebe motivo legível",
      unreachable?.last_status !== null,
      `status=${unreachable?.last_status} erro=${unreachable?.last_error ?? "—"}`,
    );

    // --- catálogo ----------------------------------------------------------
    const catRes = await saveCategoryAction({}, fd({ name: "Categoria de verificação", icon: "Boxes", color: "rose" }));
    const cat = await get<{ id: string }>("SELECT id FROM categories WHERE slug = 'categoria-de-verificacao'");
    check("criar categoria", Boolean(cat) && Boolean(catRes.ok));

    await saveTagAction({}, fd({ name: "tag-verificacao", color: "amber" }));
    check("criar tag", Boolean(await get("SELECT 1 FROM tags WHERE slug = 'tag-verificacao'")));

    const toolRes = await saveToolAction({}, fd({ name: "Ferramenta de verificação", url: "exemplo.com/painel", color: "blue", icon: "Wrench" }));
    const tool = await get<{ id: string; url: string }>("SELECT id, url FROM tools WHERE name = 'Ferramenta de verificação'");
    check("criar ferramenta com URL normalizada", tool?.url === "https://exemplo.com/painel", tool?.url);
    check("resposta de sucesso da ferramenta", Boolean(toolRes.ok));

    // --- limpeza -----------------------------------------------------------
    await tolerateRedirect(() => deleteProjectAction(fd({ id: created.id })));
    check("excluir projeto", !(await get("SELECT 1 FROM projects WHERE id = ?", [created.id])));
    check(
      "cascata apagou filhos",
      !(await get("SELECT 1 FROM project_links WHERE project_id = ?", [created.id])) &&
        !(await get("SELECT 1 FROM project_steps WHERE project_id = ?", [created.id])) &&
        !(await get("SELECT 1 FROM notes WHERE project_id = ?", [created.id])),
    );
    if (copy) await tolerateRedirect(() => deleteProjectAction(fd({ id: copy.id })));
    if (cat) await deleteCategoryAction(fd({ id: cat.id }));
    if (tool) await deleteToolAction(fd({ id: tool.id }));
    await run("DELETE FROM tags WHERE slug IN ('tag-verificacao','autoteste','temporaria')");
    await run("DELETE FROM activity WHERE title LIKE '%verificação%' OR detail LIKE '%verificação%'");
    check("limpeza concluída", true);
  } catch (err) {
    check("execução sem exceção", false, err instanceof Error ? err.message : String(err));
  }

  const failed = steps.filter((s) => !s.ok);
  return NextResponse.json(
    { total: steps.length, falhas: failed.length, steps },
    { status: failed.length === 0 ? 200 : 500 },
  );
}
