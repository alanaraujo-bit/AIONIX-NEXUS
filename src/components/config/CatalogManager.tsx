"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Icon } from "@/components/Icon";
import { ActionButton } from "@/components/ui/ActionForm";
import { EmptyState, FormError, SubmitButton } from "@/components/ui/Bits";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { ColorPicker, IconPicker } from "@/components/ui/Pickers";
import { useToast } from "@/components/ui/Toast";
import { moveCatalogAction, type ActionState } from "@/lib/actions/catalog";
import { asAccent, type Accent } from "@/lib/domain";
import { cn } from "@/lib/utils";

export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  descricao?: string | null;
  count: number;
}

function fire(action: (fd: FormData) => void | Promise<void>, fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  void action(fd);
}

export function CatalogManager({
  items,
  table,
  singular,
  plural,
  withIcon = true,
  withDescription = false,
  hrefFor,
  saveAction,
  deleteAction,
  emptyHint,
  reorderable = true,
}: {
  items: CatalogItem[];
  table: "categories" | "tags";
  singular: string;
  plural: string;
  withIcon?: boolean;
  withDescription?: boolean;
  hrefFor: (item: CatalogItem) => string;
  saveAction: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  deleteAction: (fd: FormData) => void | Promise<void>;
  emptyHint: string;
  reorderable?: boolean;
}) {
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-4)]">
          {items.length} {items.length === 1 ? singular.toLowerCase() : plural.toLowerCase()}
        </p>
        <button type="button" onClick={() => setCreating(true)} className="btn btn-primary btn-sm">
          <Plus size={14} />
          Nova {singular.toLowerCase()}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<Plus size={19} />} title={`Nenhuma ${singular.toLowerCase()}`} description={emptyHint} compact />
        </div>
      ) : (
        <ul className="panel divided overflow-hidden">
          {items.map((item) => (
            <li key={item.id} className="row group flex items-center gap-3 px-3.5 py-2.5">
              <span
                className={cn(`ac-${item.color}`, "flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border")}
                style={{
                  background: "color-mix(in oklab, var(--ac) 12%, transparent)",
                  borderColor: "color-mix(in oklab, var(--ac) 22%, transparent)",
                  color: "var(--ac)",
                }}
              >
                {withIcon && item.icon ? <Icon name={item.icon} size={14} /> : <span className="text-xs font-semibold">#</span>}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium">{item.name}</span>
                <span className="mono block truncate text-[0.625rem] text-[var(--text-4)]">
                  {item.descricao || item.slug}
                </span>
              </span>

              <Link
                href={hrefFor(item)}
                className="num flex-none rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-3)] transition-colors hover:text-[var(--accent)]"
              >
                {item.count}
              </Link>

              <span className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" onClick={() => setEditing(item)} className="btn btn-ghost btn-icon btn-sm" title="Editar">
                  <Pencil size={13} />
                </button>
                <Menu
                  align="end"
                  sheetTitle={item.name}
                  items={[
                    ...(reorderable
                      ? [
                          {
                            key: "up",
                            label: "Mover para cima",
                            icon: <ChevronUp size={14} />,
                            onSelect: () => fire(moveCatalogAction, { table, id: item.id, dir: "up" }),
                          },
                          {
                            key: "down",
                            label: "Mover para baixo",
                            icon: <ChevronDown size={14} />,
                            onSelect: () => fire(moveCatalogAction, { table, id: item.id, dir: "down" }),
                          },
                        ]
                      : []),
                    {
                      key: "del",
                      label: "Excluir",
                      icon: <Trash2 size={14} />,
                      danger: true,
                      separatorBefore: reorderable,
                      onSelect: () => setDeleting(item),
                    },
                  ]}
                  trigger={
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Opções">
                      <MoreHorizontal size={13} />
                    </button>
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <ItemModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        item={editing}
        singular={singular}
        withIcon={withIcon}
        withDescription={withDescription}
        action={saveAction}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Excluir ${singular.toLowerCase()}`}
        description={
          deleting && deleting.count > 0
            ? `${deleting.count} projeto(s) perdem esta marcação. Os projetos continuam existindo.`
            : `“${deleting?.name}” será removida.`
        }
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <form action={deleteAction} onSubmit={() => setTimeout(() => setDeleting(null), 80)}>
              <input type="hidden" name="id" value={deleting?.id ?? ""} />
              <ActionButton className="btn btn-danger" spinnerSize={14}>
                Excluir
              </ActionButton>
            </form>
          </>
        }
      >
        <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">Essa ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}

function ItemModal({
  open,
  onClose,
  item,
  singular,
  withIcon,
  withDescription,
  action,
}: {
  open: boolean;
  onClose: () => void;
  item: CatalogItem | null;
  singular: string;
  withIcon: boolean;
  withDescription: boolean;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [icon, setIcon] = useState(item?.icon ?? "Layers");
  const [color, setColor] = useState<Accent>(asAccent(item?.color));
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setIcon(item?.icon ?? "Layers");
    setColor(asAccent(item?.color));
  }, [open, item]);

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
      title={item ? `Editar ${singular.toLowerCase()}` : `Nova ${singular.toLowerCase()}`}
      size="sm"
    >
      <form action={formAction} className="space-y-3.5">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <div className="field">
          <label className="label" htmlFor="cat-name">
            Nome <span className="text-[var(--bad)]">*</span>
          </label>
          <input id="cat-name" name="name" defaultValue={item?.name ?? ""} className="input" required data-autofocus />
        </div>

        {withDescription ? (
          <div className="field">
            <label className="label" htmlFor="cat-desc">
              Descrição
            </label>
            <input id="cat-desc" name="descricao" defaultValue={item?.descricao ?? ""} className="input" />
          </div>
        ) : null}

        {withIcon ? (
          <div className="field">
            <span className="label">Ícone</span>
            <IconPicker name="icon" value={icon} onChange={setIcon} accent={color} />
          </div>
        ) : null}

        <div className="field">
          <span className="label">Cor</span>
          <ColorPicker name="color" value={color} onChange={setColor} />
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
