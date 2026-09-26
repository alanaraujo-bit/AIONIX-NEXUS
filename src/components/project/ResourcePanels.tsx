"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ExternalLink,
  FileText,
  KeyRound,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { CopyButton, EmptyState, FormError, SubmitButton } from "@/components/ui/Bits";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  deleteAssetAction,
  deleteCredentialAction,
  deleteNoteAction,
  saveAssetAction,
  saveCredentialAction,
  saveNoteAction,
  toggleNotePinAction,
  type ActionState,
} from "@/lib/actions/projects";
import type { Note, ProjectAsset, ProjectCredential } from "@/lib/types";
import { cn, formatDate, prettyUrl, relativeTime, toDateInput } from "@/lib/utils";

/* ------------------------------------------------------------- cabeçalho */

function PanelShell({
  title,
  count,
  onAdd,
  addLabel = "Adicionar",
  children,
  footnote,
}: {
  title: string;
  count?: number;
  onAdd: () => void;
  addLabel?: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-4 py-3">
        <h2 className="h-section">{title}</h2>
        {count ? (
          <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)]">
            {count}
          </span>
        ) : null}
        <button type="button" onClick={onAdd} className="btn btn-ghost btn-sm ml-auto">
          <Plus size={13} />
          {addLabel}
        </button>
      </div>
      {children}
      {footnote}
    </div>
  );
}

/* ------------------------------------------------------------ credenciais */

export function CredentialsPanel({
  projectId,
  credentials,
}: {
  projectId: string;
  credentials: ProjectCredential[];
}) {
  const [editing, setEditing] = useState<ProjectCredential | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ProjectCredential | null>(null);

  return (
    <PanelShell
      title="Credenciais (referência)"
      count={credentials.length}
      onAdd={() => setCreating(true)}
      footnote={
        <p className="flex items-start gap-2 border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-4 py-2.5 text-[0.6875rem] leading-relaxed text-[var(--text-4)]">
          <ShieldCheck size={13} className="mt-px flex-none text-[var(--ok)]" />
          O NEXUS guarda <strong className="font-medium text-[var(--text-3)]">onde</strong> a credencial vive — cofre,
          usuário e link. Nunca a senha, o token ou a chave.
        </p>
      }
    >
      {credentials.length === 0 ? (
        <EmptyState
          icon={<KeyRound size={18} />}
          title="Nenhuma referência"
          description="Aponte para o cofre (1Password, Bitwarden, .env do Railway) sem copiar o segredo para cá."
          compact
        />
      ) : (
        <ul className="divided">
          {credentials.map((c) => (
            <li key={c.id} className="row group flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-3)]">
                <KeyRound size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium">{c.label}</span>
                <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--text-4)]">
                  {[c.vault, c.identifier, c.rotated_at ? `girada em ${formatDate(c.rotated_at)}` : null]
                    .filter(Boolean)
                    .join(" · ") || "sem detalhes"}
                </span>
              </span>
              <span className="flex flex-none items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                {c.identifier ? <CopyButton value={c.identifier} label="Copiar identificador" /> : null}
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Abrir cofre">
                    <ExternalLink size={13} />
                  </a>
                ) : null}
                <button type="button" onClick={() => setEditing(c)} className="btn btn-ghost btn-icon btn-sm" title="Editar">
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(c)}
                  className="btn btn-ghost btn-icon btn-sm hover:text-[var(--bad)]"
                  title="Excluir"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <RecordModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Editar referência" : "Nova referência de credencial"}
        description="Nada aqui é secreto: é o mapa para encontrar o segredo no cofre certo."
        action={saveCredentialAction}
        hidden={{ project_id: projectId, id: editing?.id }}
        fields={[
          { name: "label", label: "Nome", placeholder: "Ex.: Admin do painel", required: true, value: editing?.label },
          { name: "vault", label: "Onde está guardada", placeholder: "1Password · cofre AIONIX", value: editing?.vault },
          { name: "identifier", label: "Usuário / identificador", placeholder: "admin@aionix.com", value: editing?.identifier },
          { name: "url", label: "Link do cofre ou do login", placeholder: "https://…", value: editing?.url },
          { name: "rotated_at", label: "Última rotação", type: "date", value: toDateInput(editing?.rotated_at) },
          { name: "note", label: "Observação", type: "textarea", placeholder: "Ex.: exige 2FA do app autenticador", value: editing?.note },
        ]}
      />

      <DeleteModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        action={deleteCredentialAction}
        id={deleting?.id}
        title="Excluir referência"
        description={deleting ? `“${deleting.label}” sai do projeto. A credencial em si não é afetada.` : ""}
      />
    </PanelShell>
  );
}

/* ---------------------------------------------------------------- anexos */

export function AssetsPanel({ projectId, assets }: { projectId: string; assets: ProjectAsset[] }) {
  const [editing, setEditing] = useState<ProjectAsset | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ProjectAsset | null>(null);

  return (
    <PanelShell title="Arquivos e referências" count={assets.length} onAdd={() => setCreating(true)}>
      {assets.length === 0 ? (
        <EmptyState
          icon={<FileText size={18} />}
          title="Nada anexado"
          description="Caminhos de pasta, contratos, briefings, planilhas — qualquer lugar onde o material do projeto mora."
          compact
        />
      ) : (
        <ul className="divided">
          {assets.map((a) => {
            const isUrl = /^https?:\/\//i.test(a.location);
            return (
              <li key={a.id} className="row group flex items-center gap-3 px-3.5 py-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-3)]">
                  <FileText size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium">{a.label}</span>
                  <span className="mono mt-0.5 block truncate text-[0.625rem] text-[var(--text-4)]">
                    {isUrl ? prettyUrl(a.location) : a.location}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                  <CopyButton value={a.location} label="Copiar caminho" />
                  {isUrl ? (
                    <a href={a.location} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Abrir">
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                  <button type="button" onClick={() => setEditing(a)} className="btn btn-ghost btn-icon btn-sm" title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(a)}
                    className="btn btn-ghost btn-icon btn-sm hover:text-[var(--bad)]"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <RecordModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Editar referência" : "Nova referência"}
        action={saveAssetAction}
        hidden={{ project_id: projectId, id: editing?.id }}
        fields={[
          { name: "label", label: "Nome", placeholder: "Ex.: Contrato assinado", required: true, value: editing?.label },
          {
            name: "location",
            label: "Localização",
            placeholder: "https://… ou C:\\Projetos\\…",
            required: true,
            value: editing?.location,
          },
          { name: "note", label: "Observação", type: "textarea", value: editing?.note },
        ]}
      />

      <DeleteModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        action={deleteAssetAction}
        id={deleting?.id}
        title="Excluir referência"
        description={deleting ? `“${deleting.label}” sai do projeto.` : ""}
      />
    </PanelShell>
  );
}

/* ----------------------------------------------------------------- notas */

export function NotesPanel({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Note | null>(null);

  return (
    <PanelShell title="Notas" count={notes.length} onAdd={() => setCreating(true)} addLabel="Nova nota">
      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={18} />}
          title="Sem notas"
          description="Decisões, combinados, coisas que você vai esquecer em duas semanas."
          compact
        />
      ) : (
        <ul className="divided">
          {notes.map((n) => (
            <li key={n.id} className="group px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {n.title ? (
                    <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium">
                      {n.pinned ? <Pin size={11} className="flex-none text-[var(--accent)]" fill="currentColor" /> : null}
                      {n.title}
                    </p>
                  ) : null}
                  <p className={cn("prose-note", n.title && "mt-1")}>{n.body}</p>
                  <p className="mt-1.5 text-[0.625rem] text-[var(--text-4)]">
                    atualizada {relativeTime(n.updated_at)}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <ActionForm action={toggleNotePinAction} fields={{ id: n.id }}>
                    <ActionButton
                      className={cn("btn btn-ghost btn-icon btn-sm", n.pinned && "text-[var(--accent)]")}
                      title={n.pinned ? "Desafixar" : "Fixar no topo"}
                    >
                      <Pin size={13} fill={n.pinned ? "currentColor" : "none"} />
                    </ActionButton>
                  </ActionForm>
                  <button type="button" onClick={() => setEditing(n)} className="btn btn-ghost btn-icon btn-sm" title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(n)}
                    className="btn btn-ghost btn-icon btn-sm hover:text-[var(--bad)]"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecordModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Editar nota" : "Nova nota"}
        action={saveNoteAction}
        hidden={{ project_id: projectId, id: editing?.id }}
        fields={[
          { name: "title", label: "Título", placeholder: "Opcional", value: editing?.title },
          { name: "body", label: "Nota", type: "textarea", rows: 8, required: true, value: editing?.body, autofocus: true },
        ]}
      />

      <DeleteModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        action={deleteNoteAction}
        id={deleting?.id}
        title="Excluir nota"
        description="O conteúdo será perdido."
      />
    </PanelShell>
  );
}

/* ---------------------------------------------------------- modal genérico */

interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "textarea";
  rows?: number;
  required?: boolean;
  value?: string | null;
  autofocus?: boolean;
}

function RecordModal({
  open,
  onClose,
  title,
  description,
  action,
  hidden,
  fields,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  hidden: Record<string, string | undefined>;
  fields: FieldDef[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: state.ok, tone: "success" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="md">
      <form action={formAction} className="space-y-3.5">
        {Object.entries(hidden).map(([k, v]) =>
          v === undefined ? null : <input key={k} type="hidden" name={k} value={v} />,
        )}
        {fields.map((f, i) => (
          <div key={f.name} className="field">
            <label className="label" htmlFor={`rm-${f.name}`}>
              {f.label}
              {f.required ? <span className="text-[var(--bad)]"> *</span> : null}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={`rm-${f.name}`}
                name={f.name}
                defaultValue={f.value ?? ""}
                placeholder={f.placeholder}
                rows={f.rows ?? 4}
                required={f.required}
                className="textarea"
                data-autofocus={f.autofocus || i === 0 ? true : undefined}
              />
            ) : (
              <input
                id={`rm-${f.name}`}
                name={f.name}
                type={f.type ?? "text"}
                defaultValue={f.value ?? ""}
                placeholder={f.placeholder}
                required={f.required}
                className="input"
                data-autofocus={f.autofocus || i === 0 ? true : undefined}
              />
            )}
          </div>
        ))}

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
