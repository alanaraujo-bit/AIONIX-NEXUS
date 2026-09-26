"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { Icon } from "@/components/Icon";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { EmptyState, FormError, SubmitButton, Switch } from "@/components/ui/Bits";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { ColorPicker, IconPicker } from "@/components/ui/Pickers";
import { useToast } from "@/components/ui/Toast";
import {
  deleteToolAction,
  deleteToolGroupAction,
  moveCatalogAction,
  saveToolAction,
  registerToolOpenAction,
  saveToolGroupAction,
  toggleToolFavoriteAction,
  type ActionState,
} from "@/lib/actions/catalog";
import { asAccent, type Accent } from "@/lib/domain";
import type { Tool, ToolGroup } from "@/lib/types";
import { cn, fold, prettyUrl } from "@/lib/utils";

function fire(action: (fd: FormData) => void | Promise<void>, fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  void action(fd);
}

export function QuickAccess({ groups, tools }: { groups: ToolGroup[]; tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const [toolModal, setToolModal] = useState<{ tool: Tool | null; groupId: string | null } | null>(null);
  const [groupModal, setGroupModal] = useState<{ group: ToolGroup | null } | null>(null);
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<ToolGroup | null>(null);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return tools;
    return tools.filter((t) => fold(`${t.name} ${t.subtitle ?? ""} ${t.url}`).includes(q));
  }, [tools, query]);

  const favorites = filtered.filter((t) => t.favorite);
  const ungrouped = filtered.filter((t) => !t.group_id);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-4)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar atalhos…"
            className="input pl-9"
            aria-label="Filtrar atalhos"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1.5 text-[var(--text-4)] hover:text-[var(--text)]"
              aria-label="Limpar"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
        <button type="button" onClick={() => setGroupModal({ group: null })} className="btn btn-subtle">
          <FolderPlus size={14} />
          Novo grupo
        </button>
        <button type="button" onClick={() => setToolModal({ tool: null, groupId: null })} className="btn btn-primary">
          <Plus size={15} />
          Novo atalho
        </button>
      </div>

      {tools.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<ExternalLink size={19} />}
            title="Nenhum atalho ainda"
            description="Cadastre os painéis que você abre todo dia: GitHub, Vercel, Railway, Cloudflare, bancos, ferramentas de IA."
            action={
              <button type="button" onClick={() => setToolModal({ tool: null, groupId: null })} className="btn btn-primary">
                <Plus size={15} />
                Criar primeiro atalho
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<Search size={19} />} title={`Nada com “${query}”`} compact />
        </div>
      ) : (
        <>
          {favorites.length > 0 && !query ? (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <Star size={13} className="text-[var(--warn)]" />
                <h2 className="h-section">Favoritos</h2>
              </div>
              <ToolGrid
                tools={favorites}
                onEdit={(t) => setToolModal({ tool: t, groupId: t.group_id })}
                onDelete={setDeletingTool}
              />
            </section>
          ) : null}

          {groups.map((g) => {
            const items = filtered.filter((t) => t.group_id === g.id);
            if (items.length === 0 && query) return null;
            return (
              <section key={g.id}>
                <div className="mb-2.5 flex items-center gap-2">
                  <Icon name={g.icon} size={13} className="text-[var(--text-4)]" />
                  <h2 className="h-section">{g.name}</h2>
                  <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)]">
                    {items.length}
                  </span>
                  <Menu
                    align="end"
                    sheetTitle={g.name}
                    items={[
                      {
                        key: "add",
                        label: "Adicionar atalho aqui",
                        icon: <Plus size={14} />,
                        onSelect: () => setToolModal({ tool: null, groupId: g.id }),
                      },
                      { key: "edit", label: "Renomear grupo", icon: <Pencil size={14} />, onSelect: () => setGroupModal({ group: g }) },
                      {
                        key: "up",
                        label: "Mover para cima",
                        icon: <ChevronUp size={14} />,
                        separatorBefore: true,
                        onSelect: () => fire(moveCatalogAction, { table: "tool_groups", id: g.id, dir: "up" }),
                      },
                      {
                        key: "down",
                        label: "Mover para baixo",
                        icon: <ChevronDown size={14} />,
                        onSelect: () => fire(moveCatalogAction, { table: "tool_groups", id: g.id, dir: "down" }),
                      },
                      {
                        key: "del",
                        label: "Excluir grupo",
                        icon: <Trash2 size={14} />,
                        danger: true,
                        separatorBefore: true,
                        onSelect: () => setDeletingGroup(g),
                      },
                    ]}
                    trigger={
                      <button type="button" className="btn btn-ghost btn-icon btn-sm ml-auto" title="Opções do grupo">
                        <MoreHorizontal size={14} />
                      </button>
                    }
                  />
                </div>
                {items.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setToolModal({ tool: null, groupId: g.id })}
                    className="flex h-[4.25rem] w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] text-[0.75rem] text-[var(--text-4)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Plus size={14} />
                    Adicionar atalho em {g.name}
                  </button>
                ) : (
                  <ToolGrid
                    tools={items}
                    onEdit={(t) => setToolModal({ tool: t, groupId: t.group_id })}
                    onDelete={setDeletingTool}
                  />
                )}
              </section>
            );
          })}

          {ungrouped.length > 0 ? (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <Icon name="Grid2x2" size={13} className="text-[var(--text-4)]" />
                <h2 className="h-section">Sem grupo</h2>
              </div>
              <ToolGrid
                tools={ungrouped}
                onEdit={(t) => setToolModal({ tool: t, groupId: null })}
                onDelete={setDeletingTool}
              />
            </section>
          ) : null}
        </>
      )}

      <ToolModal
        open={Boolean(toolModal)}
        onClose={() => setToolModal(null)}
        tool={toolModal?.tool ?? null}
        groupId={toolModal?.groupId ?? null}
        groups={groups}
      />

      <GroupModal open={Boolean(groupModal)} onClose={() => setGroupModal(null)} group={groupModal?.group ?? null} />

      <DeleteModal
        open={Boolean(deletingTool)}
        onClose={() => setDeletingTool(null)}
        action={deleteToolAction}
        id={deletingTool?.id}
        title="Excluir atalho"
        description={deletingTool ? `“${deletingTool.name}” sai do acesso rápido.` : ""}
      />
      <DeleteModal
        open={Boolean(deletingGroup)}
        onClose={() => setDeletingGroup(null)}
        action={deleteToolGroupAction}
        id={deletingGroup?.id}
        title="Excluir grupo"
        description={deletingGroup ? `Os atalhos de “${deletingGroup.name}” vão para “Sem grupo”.` : ""}
      />
    </div>
  );
}

function ToolGrid({
  tools,
  onEdit,
  onDelete,
}: {
  tools: Tool[];
  onEdit: (t: Tool) => void;
  onDelete: (t: Tool) => void;
}) {
  return (
    <div className="stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {tools.map((t) => (
        <div key={t.id} className={cn(`ac-${t.color}`, "card-link group relative")}>
          <a
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => fire(registerToolOpenAction, { id: t.id })}
            className="flex flex-col gap-2.5 p-3.5"
          >
            <span className="flex items-start justify-between">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[9px] border"
                style={{
                  background: "color-mix(in oklab, var(--ac) 12%, transparent)",
                  borderColor: "color-mix(in oklab, var(--ac) 22%, transparent)",
                  color: "var(--ac)",
                }}
              >
                <Icon name={t.icon} size={17} />
              </span>
              {t.favorite ? <Star size={11} className="mt-1 text-[var(--warn)]" fill="currentColor" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] font-medium">{t.name}</span>
              <span className="mt-0.5 block truncate text-[0.625rem] text-[var(--text-4)]">
                {t.subtitle ?? prettyUrl(t.url)}
              </span>
            </span>
          </a>

          <span className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <ActionForm action={toggleToolFavoriteAction} fields={{ id: t.id }}>
              <ActionButton
                className={cn("btn btn-ghost btn-icon btn-sm", t.favorite && "text-[var(--warn)]")}
                title={t.favorite ? "Remover dos favoritos" : "Favoritar"}
                spinnerSize={11}
              >
                <Star size={12} fill={t.favorite ? "currentColor" : "none"} />
              </ActionButton>
            </ActionForm>
            <Menu
              align="end"
              sheetTitle={t.name}
              items={[
                { key: "edit", label: "Editar", icon: <Pencil size={14} />, onSelect: () => onEdit(t) },
                {
                  key: "up",
                  label: "Mover para cima",
                  icon: <ChevronUp size={14} />,
                  onSelect: () => fire(moveCatalogAction, { table: "tools", id: t.id, dir: "up" }),
                },
                {
                  key: "down",
                  label: "Mover para baixo",
                  icon: <ChevronDown size={14} />,
                  onSelect: () => fire(moveCatalogAction, { table: "tools", id: t.id, dir: "down" }),
                },
                { key: "del", label: "Excluir", icon: <Trash2 size={14} />, danger: true, separatorBefore: true, onSelect: () => onDelete(t) },
              ]}
              trigger={
                <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Opções">
                  <MoreHorizontal size={13} />
                </button>
              }
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function ToolModal({
  open,
  onClose,
  tool,
  groupId,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  tool: Tool | null;
  groupId: string | null;
  groups: ToolGroup[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveToolAction, {});
  const [icon, setIcon] = useState(tool?.icon ?? "ExternalLink");
  const [color, setColor] = useState<Accent>(asAccent(tool?.color));
  const [favorite, setFavorite] = useState(tool?.favorite ?? false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setIcon(tool?.icon ?? "ExternalLink");
    setColor(asAccent(tool?.color));
    setFavorite(tool?.favorite ?? false);
  }, [open, tool]);

  useEffect(() => {
    if (state.ok) {
      toast({ title: state.ok, tone: "success" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal open={open} onClose={onClose} title={tool ? "Editar atalho" : "Novo atalho"} size="md">
      <form action={action} className="space-y-3.5">
        {tool ? <input type="hidden" name="id" value={tool.id} /> : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="tool-name">
              Nome <span className="text-[var(--bad)]">*</span>
            </label>
            <input id="tool-name" name="name" defaultValue={tool?.name ?? ""} className="input" required data-autofocus />
          </div>
          <div className="field">
            <label className="label" htmlFor="tool-group">
              Grupo
            </label>
            <select id="tool-group" name="group_id" defaultValue={tool?.group_id ?? groupId ?? ""} className="select">
              <option value="">Sem grupo</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="tool-url">
            URL <span className="text-[var(--bad)]">*</span>
          </label>
          <input id="tool-url" name="url" defaultValue={tool?.url ?? ""} className="input" placeholder="https://…" required inputMode="url" />
        </div>

        <div className="field">
          <label className="label" htmlFor="tool-subtitle">
            Descrição curta
          </label>
          <input
            id="tool-subtitle"
            name="subtitle"
            defaultValue={tool?.subtitle ?? ""}
            className="input"
            placeholder="Ex.: deploys do frontend"
            maxLength={60}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-[auto_1fr]">
          <div className="field">
            <span className="label">Ícone</span>
            <IconPicker name="icon" value={icon} onChange={setIcon} accent={color} />
          </div>
          <div className="field">
            <span className="label">Cor</span>
            <ColorPicker name="color" value={color} onChange={setColor} />
          </div>
        </div>

        <div className="inset p-3">
          <Switch
            checked={favorite}
            onChange={setFavorite}
            name="favorite"
            label="Mostrar no cockpit"
            description="Favoritos aparecem no painel de acesso rápido da Home."
          />
        </div>

        <FormError message={state.error} />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <SubmitButton className="btn btn-primary" pendingLabel="Salvando…">
            Salvar atalho
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function GroupModal({ open, onClose, group }: { open: boolean; onClose: () => void; group: ToolGroup | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveToolGroupAction, {});
  const [icon, setIcon] = useState(group?.icon ?? "Grid2x2");
  const { toast } = useToast();

  useEffect(() => {
    if (open) setIcon(group?.icon ?? "Grid2x2");
  }, [open, group]);

  useEffect(() => {
    if (state.ok) {
      toast({ title: state.ok, tone: "success" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal open={open} onClose={onClose} title={group ? "Renomear grupo" : "Novo grupo"} size="sm">
      <form action={action} className="space-y-3.5">
        {group ? <input type="hidden" name="id" value={group.id} /> : null}
        <div className="field">
          <label className="label" htmlFor="group-name">
            Nome <span className="text-[var(--bad)]">*</span>
          </label>
          <input id="group-name" name="name" defaultValue={group?.name ?? ""} className="input" required data-autofocus />
        </div>
        <div className="field">
          <span className="label">Ícone</span>
          <IconPicker name="icon" value={icon} onChange={setIcon} />
        </div>
        <FormError message={state.error} />
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <SubmitButton className="btn btn-primary" pendingLabel="Salvando…">
            Salvar
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({
  open,
  onClose,
  action,
  id,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  action: (fd: FormData) => void | Promise<void>;
  id?: string;
  title: string;
  description: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <form action={action} onSubmit={() => setTimeout(onClose, 80)}>
            <input type="hidden" name="id" value={id ?? ""} />
            <ActionButton className="btn btn-danger" spinnerSize={14}>
              Excluir
            </ActionButton>
          </form>
        </>
      }
    >
      <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">Essa ação não pode ser desfeita.</p>
    </Modal>
  );
}
