"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Building2, ExternalLink, Mail, MoreHorizontal, Pencil, Phone, Plus, Trash2 } from "lucide-react";

import { EntityAvatar } from "@/components/Badges";
import { ActionButton } from "@/components/ui/ActionForm";
import { EmptyState, FormError, SubmitButton, Switch } from "@/components/ui/Bits";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { ColorPicker, IconPicker } from "@/components/ui/Pickers";
import { useToast } from "@/components/ui/Toast";
import { deleteClientAction, saveClientAction, type ActionState } from "@/lib/actions/catalog";
import { asAccent, type Accent } from "@/lib/domain";
import type { Client } from "@/lib/types";
import { cn, prettyUrl } from "@/lib/utils";

export interface ClientWithStats extends Client {
  projectCount: number;
  activeCount: number;
}

export function ClientsManager({ clients }: { clients: ClientWithStats[] }) {
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ClientWithStats | null>(null);

  const active = clients.filter((c) => !c.archived);
  const archived = clients.filter((c) => c.archived);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus size={15} />
          Novo cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Building2 size={19} />}
            title="Nenhum cliente cadastrado"
            description="Cadastre clientes para agrupar entregas contratadas e separar do que é produto próprio."
            action={
              <button type="button" onClick={() => setCreating(true)} className="btn btn-primary">
                <Plus size={15} />
                Cadastrar cliente
              </button>
            }
          />
        </div>
      ) : (
        <>
          <Grid clients={active} onEdit={setEditing} onDelete={setDeleting} />
          {archived.length > 0 ? (
            <section>
              <h2 className="h-section mb-2.5 flex items-center gap-1.5">
                <Archive size={12} />
                Arquivados
              </h2>
              <Grid clients={archived} onEdit={setEditing} onDelete={setDeleting} />
            </section>
          ) : null}
        </>
      )}

      <ClientModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        client={editing}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Excluir ${deleting?.name ?? "cliente"}`}
        description={
          deleting && deleting.projectCount > 0
            ? `${deleting.projectCount} projeto(s) ficarão sem cliente. Os projetos em si não são apagados.`
            : "O cliente será removido."
        }
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <form action={deleteClientAction} onSubmit={() => setTimeout(() => setDeleting(null), 80)}>
              <input type="hidden" name="id" value={deleting?.id ?? ""} />
              <ActionButton className="btn btn-danger" spinnerSize={14}>
                Excluir cliente
              </ActionButton>
            </form>
          </>
        }
      >
        <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
          Se for só uma conta encerrada, prefira <strong className="font-medium text-[var(--text)]">arquivar</strong> ao
          editar o cliente.
        </p>
      </Modal>
    </div>
  );
}

function Grid({
  clients,
  onEdit,
  onDelete,
}: {
  clients: ClientWithStats[];
  onEdit: (c: Client) => void;
  onDelete: (c: ClientWithStats) => void;
}) {
  return (
    <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {clients.map((c) => (
        <article key={c.id} className={cn("card-link group relative p-4", c.archived && "opacity-70")}>
          <Link href={`/clientes/${c.slug}`} className="absolute inset-0 rounded-[var(--radius-lg)]">
            <span className="sr-only">Abrir {c.name}</span>
          </Link>

          <div className="flex items-start gap-3">
            <EntityAvatar icon={c.icon} accent={c.color} size="md" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[0.875rem] font-semibold">{c.name}</h3>
              <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--text-4)]">{c.company ?? c.contact ?? "—"}</p>
            </div>
            <span className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Menu
                align="end"
                sheetTitle={c.name}
                items={[
                  { key: "edit", label: "Editar cliente", icon: <Pencil size={14} />, onSelect: () => onEdit(c) },
                  { key: "open", label: "Ver projetos", icon: <ExternalLink size={14} />, href: `/clientes/${c.slug}` },
                  {
                    key: "del",
                    label: "Excluir",
                    icon: <Trash2 size={14} />,
                    danger: true,
                    separatorBefore: true,
                    onSelect: () => onDelete(c),
                  },
                ]}
                trigger={
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Opções">
                    <MoreHorizontal size={14} />
                  </button>
                }
              />
            </span>
          </div>

          {c.notes ? <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-3)]">{c.notes}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-3 text-[0.6875rem] text-[var(--text-4)]">
            <span className="num">
              <strong className="font-semibold text-[var(--text-2)]">{c.projectCount}</strong> projeto
              {c.projectCount === 1 ? "" : "s"}
            </span>
            {c.activeCount > 0 ? (
              <span className="ac-emerald flex items-center gap-1">
                <span className="dot" />
                {c.activeCount} ativo{c.activeCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {c.archived ? <span className="chip chip-quiet">Arquivado</span> : null}
            <span className="relative z-10 ml-auto flex items-center gap-1.5">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="btn btn-ghost btn-icon btn-sm" title={c.email}>
                  <Mail size={12} />
                </a>
              ) : null}
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="btn btn-ghost btn-icon btn-sm" title={c.phone}>
                  <Phone size={12} />
                </a>
              ) : null}
              {c.website ? (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-icon btn-sm"
                  title={prettyUrl(c.website)}
                >
                  <ExternalLink size={12} />
                </a>
              ) : null}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClientModal({ open, onClose, client }: { open: boolean; onClose: () => void; client: Client | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveClientAction, {});
  const [icon, setIcon] = useState(client?.icon ?? "Building2");
  const [color, setColor] = useState<Accent>(asAccent(client?.color));
  const [archived, setArchived] = useState(client?.archived ?? false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setIcon(client?.icon ?? "Building2");
    setColor(asAccent(client?.color));
    setArchived(client?.archived ?? false);
  }, [open, client]);

  useEffect(() => {
    if (state.ok) {
      toast({ title: state.ok, tone: "success" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal open={open} onClose={onClose} title={client ? "Editar cliente" : "Novo cliente"} size="md">
      <form action={action} className="space-y-3.5">
        {client ? <input type="hidden" name="id" value={client.id} /> : null}

        <div className="field">
          <label className="label" htmlFor="cl-name">
            Nome <span className="text-[var(--bad)]">*</span>
          </label>
          <input id="cl-name" name="name" defaultValue={client?.name ?? ""} className="input" required data-autofocus />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="cl-company">
              Razão social
            </label>
            <input id="cl-company" name="company" defaultValue={client?.company ?? ""} className="input" />
          </div>
          <div className="field">
            <label className="label" htmlFor="cl-contact">
              Contato
            </label>
            <input id="cl-contact" name="contact" defaultValue={client?.contact ?? ""} className="input" />
          </div>
          <div className="field">
            <label className="label" htmlFor="cl-email">
              E-mail
            </label>
            <input id="cl-email" name="email" type="email" defaultValue={client?.email ?? ""} className="input" />
          </div>
          <div className="field">
            <label className="label" htmlFor="cl-phone">
              Telefone
            </label>
            <input id="cl-phone" name="phone" defaultValue={client?.phone ?? ""} className="input" />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="cl-website">
            Site
          </label>
          <input id="cl-website" name="website" defaultValue={client?.website ?? ""} className="input" placeholder="https://…" />
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

        <div className="field">
          <label className="label" htmlFor="cl-notes">
            Observações
          </label>
          <textarea id="cl-notes" name="notes" defaultValue={client?.notes ?? ""} rows={3} className="textarea" />
        </div>

        <div className="inset p-3">
          <Switch
            checked={archived}
            onChange={setArchived}
            name="archived"
            label="Cliente arquivado"
            description="Some das listagens e dos seletores, mas os projetos continuam vinculados."
          />
        </div>

        <FormError message={state.error} />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <SubmitButton className="btn btn-primary" pendingLabel="Salvando…">
            Salvar cliente
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
