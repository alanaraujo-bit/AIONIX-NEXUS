"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Radar,
  Star,
  Trash2,
} from "lucide-react";

import { Icon } from "@/components/Icon";
import { ActionButton, ActionForm, ConfirmAction } from "@/components/ui/ActionForm";
import { CopyButton, EmptyState, FormError, SubmitButton, Switch } from "@/components/ui/Bits";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { LINK_GROUP_ORDER, LINK_KINDS, LINK_KIND_META, type LinkKind } from "@/lib/domain";
import {
  deleteLinkAction,
  moveLinkAction,
  saveLinkAction,
  setPrimaryLinkAction,
  type ActionState,
} from "@/lib/actions/projects";
import { checkProjectLinksAction, checkSingleLinkAction } from "@/lib/actions/links";
import type { ProjectLink } from "@/lib/types";
import { cn, prettyUrl, relativeTime } from "@/lib/utils";

export function LinksPanel({ projectId, links }: { projectId: string; links: ProjectLink[] }) {
  const [editing, setEditing] = useState<ProjectLink | null>(null);
  const [creating, setCreating] = useState<LinkKind | null>(null);
  const [deleting, setDeleting] = useState<ProjectLink | null>(null);

  const grouped = LINK_GROUP_ORDER.map((group) => ({
    group,
    items: links.filter((l) => LINK_KIND_META[l.kind].group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-4 py-3">
        <h2 className="h-section">Links e recursos</h2>
        {links.length > 0 ? (
          <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)]">
            {links.length}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          {links.some((l) => l.monitor) ? (
            <ActionForm action={checkProjectLinksAction} fields={{ project_id: projectId }}>
              <ActionButton className="btn btn-ghost btn-sm" title="Verificar se os links respondem">
                <Radar size={13} />
                <span className="hidden sm:inline">Verificar</span>
              </ActionButton>
            </ActionForm>
          ) : null}
          <button type="button" onClick={() => setCreating("production")} className="btn btn-ghost btn-sm">
            <Plus size={13} />
            Adicionar
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={<ExternalLink size={18} />}
          title="Nenhum link cadastrado"
          description="Produção, repositório, Railway, Vercel, banco, documentação — tudo que você abre para tocar esse projeto."
          action={
            <div className="flex flex-wrap justify-center gap-1.5">
              {(["production", "repo", "railway", "vercel", "admin"] as LinkKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setCreating(k)} className="btn btn-default btn-sm">
                  <Icon name={LINK_KIND_META[k].icon} size={12} />
                  {LINK_KIND_META[k].label}
                </button>
              ))}
            </div>
          }
          compact
        />
      ) : (
        <div className="divided">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              <p className="bg-[var(--surface-2)] px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.09em] text-[var(--text-4)] uppercase">
                {group}
              </p>
              <ul className="divided">
                {items.map((link) => (
                  <LinkRow key={link.id} link={link} onEdit={() => setEditing(link)} onDelete={() => setDeleting(link)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Excluir link"
        description={deleting ? `“${deleting.label}” será removido deste projeto.` : ""}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <form action={deleteLinkAction} onSubmit={() => setTimeout(() => setDeleting(null), 80)}>
              <input type="hidden" name="id" value={deleting?.id ?? ""} />
              <ActionButton className="btn btn-danger" spinnerSize={14}>
                Excluir link
              </ActionButton>
            </form>
          </>
        }
      >
        <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
          O endereço sai do NEXUS, mas nada é alterado no serviço de destino.
        </p>
      </Modal>

      <LinkModal
        projectId={projectId}
        link={editing}
        defaultKind={creating}
        open={Boolean(editing || creating)}
        onClose={() => {
          setEditing(null);
          setCreating(null);
        }}
      />
    </div>
  );
}

function LinkRow({ link, onEdit, onDelete }: { link: ProjectLink; onEdit: () => void; onDelete: () => void }) {
  const meta = LINK_KIND_META[link.kind];
  const failed = link.last_status !== null && (link.last_status === 0 || link.last_status >= 400);
  const ok = link.last_status !== null && link.last_status > 0 && link.last_status < 400;

  return (
    <li className="row group flex items-center gap-3 px-3.5 py-2.5">
      <span
        className={cn(`ac-${meta.accent}`, "relative flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border")}
        style={{
          background: "color-mix(in oklab, var(--ac) 11%, transparent)",
          borderColor: "color-mix(in oklab, var(--ac) 22%, transparent)",
          color: "var(--ac)",
        }}
      >
        <Icon name={meta.icon} size={14} />
        {link.last_status !== null ? (
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2 border-[var(--surface)]"
            style={{ background: failed ? "var(--bad)" : "var(--ok)" }}
            title={
              failed
                ? `Falhou: ${link.last_error ?? `HTTP ${link.last_status}`}`
                : `Respondeu ${link.last_status}`
            }
          />
        ) : null}
      </span>

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[0.8125rem] font-medium">{link.label}</span>
          {link.is_primary ? <Star size={10} className="flex-none text-[var(--warn)]" fill="currentColor" /> : null}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[0.6875rem] text-[var(--text-4)]">
          <span className="truncate">{prettyUrl(link.url)}</span>
          {link.last_checked_at ? (
            <span className="flex-none" style={{ color: failed ? "var(--bad)" : undefined }}>
              · {failed ? link.last_error ?? `HTTP ${link.last_status}` : `${link.last_status}`} ·{" "}
              {relativeTime(link.last_checked_at)}
            </span>
          ) : null}
        </span>
      </a>

      {link.note ? (
        <span className="hidden max-w-[12rem] truncate text-[0.6875rem] text-[var(--text-4)] lg:block" title={link.note}>
          {link.note}
        </span>
      ) : null}

      <span className="flex flex-none items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CopyButton value={link.url} label="Copiar URL" />
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-icon btn-sm"
          title="Abrir em nova aba"
        >
          <ExternalLink size={13} />
        </a>
        <Menu
          align="end"
          sheetTitle={link.label}
          items={[
            { key: "edit", label: "Editar link", icon: <Pencil size={14} />, onSelect: onEdit },
            {
              key: "primary",
              label: link.is_primary ? "Já é o link principal" : "Definir como principal",
              icon: <Star size={14} />,
              disabled: link.is_primary,
              onSelect: () => submit(setPrimaryLinkAction, { id: link.id }),
            },
            {
              key: "check",
              label: "Verificar agora",
              icon: <Radar size={14} />,
              onSelect: () => submit(checkSingleLinkAction, { id: link.id }),
            },
            {
              key: "up",
              label: "Mover para cima",
              icon: <ChevronUp size={14} />,
              separatorBefore: true,
              onSelect: () => submit(moveLinkAction, { id: link.id, dir: "up" }),
            },
            {
              key: "down",
              label: "Mover para baixo",
              icon: <ChevronDown size={14} />,
              onSelect: () => submit(moveLinkAction, { id: link.id, dir: "down" }),
            },
            {
              key: "del",
              label: "Excluir",
              icon: <Trash2 size={14} />,
              danger: true,
              separatorBefore: true,
              onSelect: onDelete,
            },
          ]}
          trigger={
            <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Mais ações">
              <MoreHorizontal size={14} />
            </button>
          }
        />
      </span>
    </li>
  );
}

/** Dispara uma server action fora de um <form> (usada pelos menus). */
function submit(action: (fd: FormData) => void | Promise<void>, fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  void action(fd);
}

function LinkModal({
  projectId,
  link,
  defaultKind,
  open,
  onClose,
}: {
  projectId: string;
  link: ProjectLink | null;
  defaultKind: LinkKind | null;
  open: boolean;
  onClose: () => void;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveLinkAction, {});
  const [kind, setKind] = useState<LinkKind>(link?.kind ?? defaultKind ?? "production");
  const [label, setLabel] = useState(link?.label ?? "");
  const [labelTouched, setLabelTouched] = useState(Boolean(link));
  const [monitor, setMonitor] = useState(link?.monitor ?? true);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setKind(link?.kind ?? defaultKind ?? "production");
    setLabel(link?.label ?? LINK_KIND_META[link?.kind ?? defaultKind ?? "production"].label);
    setLabelTouched(Boolean(link));
    setMonitor(link?.monitor ?? true);
  }, [open, link, defaultKind]);

  useEffect(() => {
    if (state.ok) {
      toast({ title: state.ok, tone: "success" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={link ? "Editar link" : "Novo link"}
      description="Cada projeto aceita quantos links você precisar."
      size="md"
    >
      <form action={action} className="space-y-4" id="link-form">
        <input type="hidden" name="project_id" value={projectId} />
        {link ? <input type="hidden" name="id" value={link.id} /> : null}

        <div className="field">
          <span className="label">Tipo</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {LINK_KINDS.map((k) => {
              const meta = LINK_KIND_META[k];
              const on = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k);
                    if (!labelTouched) setLabel(meta.label);
                  }}
                  className={cn(
                    `ac-${meta.accent}`,
                    "flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 text-[0.75rem] font-medium transition-all duration-150",
                    on
                      ? "border-[color-mix(in_oklab,var(--ac)_45%,transparent)] bg-[color-mix(in_oklab,var(--ac)_12%,transparent)] text-[var(--ac)]"
                      : "border-[var(--line)] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text)]",
                  )}
                >
                  <Icon name={meta.icon} size={13} />
                  <span className="truncate">{meta.label}</span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="kind" value={kind} />
        </div>

        <div className="field">
          <label className="label" htmlFor="link-url">
            URL
          </label>
          <input
            id="link-url"
            name="url"
            defaultValue={link?.url ?? ""}
            className="input"
            placeholder="https://…"
            required
            data-autofocus
            inputMode="url"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="link-label">
            Rótulo
          </label>
          <input
            id="link-label"
            name="label"
            value={label}
            onChange={(e) => {
              setLabelTouched(true);
              setLabel(e.target.value);
            }}
            className="input"
            placeholder={LINK_KIND_META[kind].label}
            maxLength={60}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="link-note">
            Observação
          </label>
          <input
            id="link-note"
            name="note"
            defaultValue={link?.note ?? ""}
            className="input"
            placeholder="Ex.: acesso só pela VPN"
            maxLength={120}
          />
        </div>

        <div className="inset p-3">
          <Switch
            checked={monitor}
            onChange={setMonitor}
            name="monitor"
            label="Monitorar este link"
            description="Entra na verificação de saúde e conta como link quebrado se parar de responder."
          />
        </div>

        <FormError message={state.error} />

        <div className="flex items-center justify-end gap-2 pt-1">
          {link ? (
            <ConfirmAction
              action={deleteLinkAction}
              fields={{ id: link.id }}
              title="Excluir link"
              description={`“${link.label}” será removido deste projeto.`}
              trigger={(openConfirm) => (
                <button type="button" onClick={openConfirm} className="btn btn-ghost mr-auto text-[var(--bad)]">
                  <Trash2 size={14} />
                  Excluir
                </button>
              )}
            />
          ) : null}
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <SubmitButton className="btn btn-primary" pendingLabel="Salvando…">
            Salvar link
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
