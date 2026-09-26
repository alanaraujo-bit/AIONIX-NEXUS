"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NotebookPen, Pencil, Pin, Plus, Search, Trash2, X } from "lucide-react";

import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { EmptyState, FormError, SubmitButton } from "@/components/ui/Bits";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  deleteNoteAction,
  saveNoteAction,
  toggleNotePinAction,
  type ActionState,
} from "@/lib/actions/projects";
import type { Note } from "@/lib/types";
import { cn, fold, relativeTime } from "@/lib/utils";

type NoteRow = Note & { projectName: string | null; projectSlug: string | null };

export function NotesBoard({
  notes,
  projects,
}: {
  notes: NoteRow[];
  projects: Array<{ id: string; name: string }>;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<NoteRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<NoteRow | null>(null);

  const [quickState, quickAction] = useActionState<ActionState, FormData>(saveNoteAction, {});
  const quickRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (quickState.ok) {
      quickRef.current?.reset();
      toast({ title: "Nota salva", tone: "success" });
    }
    if (quickState.error) toast({ title: quickState.error, tone: "error" });
  }, [quickState, toast]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return notes;
    return notes.filter((n) => fold(`${n.title ?? ""} ${n.body} ${n.projectName ?? ""}`).includes(q));
  }, [notes, query]);

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="space-y-5">
      {/* captura rápida */}
      <form ref={quickRef} action={quickAction} className="panel relative overflow-hidden p-3.5">
        <textarea
          name="body"
          rows={2}
          className="textarea min-h-[3.5rem] resize-none border-0 bg-transparent p-0 text-[0.8125rem] focus:shadow-none"
          placeholder="Escreva uma nota rápida… (fica avulsa, sem projeto)"
          required
        />
        <div className="mt-2 flex items-center gap-2 border-t border-[var(--line-soft)] pt-2.5">
          <select name="project_id" className="select h-8 w-auto max-w-[14rem] text-xs" defaultValue="">
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <SubmitButton className="btn btn-primary btn-sm ml-auto" pendingLabel="Salvando…">
            <Plus size={13} />
            Adicionar
          </SubmitButton>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-4)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nas notas…"
            className="input pl-9"
            aria-label="Buscar nas notas"
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
        <button type="button" onClick={() => setCreating(true)} className="btn btn-default">
          <Plus size={14} />
          Nota completa
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<NotebookPen size={19} />}
            title={notes.length === 0 ? "Nenhuma nota ainda" : `Nada com “${query}”`}
            description={
              notes.length === 0
                ? "Use o campo acima para registrar decisões e lembretes que não cabem em um próximo passo."
                : undefined
            }
            compact
          />
        </div>
      ) : (
        <div className="stagger columns-1 gap-3 md:columns-2 xl:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
          {[...pinned, ...rest].map((n) => (
            <article
              key={n.id}
              className={cn(
                "panel group relative p-3.5",
                n.pinned && "border-[var(--accent-line)] bg-[var(--accent-soft)]",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {n.title ? (
                    <h3 className="mb-1 flex items-center gap-1.5 text-[0.8125rem] font-semibold">
                      {n.pinned ? <Pin size={11} className="flex-none text-[var(--accent)]" fill="currentColor" /> : null}
                      {n.title}
                    </h3>
                  ) : null}
                  <p className="prose-note">{n.body}</p>
                </div>
              </div>

              <footer className="mt-3 flex items-center gap-2 border-t border-[var(--line-soft)] pt-2.5">
                {n.projectSlug ? (
                  <Link
                    href={`/projetos/${n.projectSlug}`}
                    className="chip chip-quiet max-w-[10rem] truncate hover:text-[var(--accent)]"
                  >
                    {n.projectName}
                  </Link>
                ) : (
                  <span className="text-[0.625rem] text-[var(--text-4)]">avulsa</span>
                )}
                <span className="num ml-auto text-[0.625rem] text-[var(--text-4)]">{relativeTime(n.updated_at)}</span>
              </footer>

              <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <ActionForm action={toggleNotePinAction} fields={{ id: n.id }}>
                  <ActionButton
                    className={cn("btn btn-ghost btn-icon btn-sm", n.pinned && "text-[var(--accent)]")}
                    title={n.pinned ? "Desafixar" : "Fixar"}
                    spinnerSize={11}
                  >
                    <Pin size={12} fill={n.pinned ? "currentColor" : "none"} />
                  </ActionButton>
                </ActionForm>
                <button type="button" onClick={() => setEditing(n)} className="btn btn-ghost btn-icon btn-sm" title="Editar">
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(n)}
                  className="btn btn-ghost btn-icon btn-sm hover:text-[var(--bad)]"
                  title="Excluir"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <NoteModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        note={editing}
        projects={projects}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Excluir nota"
        description="O conteúdo será perdido."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <form action={deleteNoteAction} onSubmit={() => setTimeout(() => setDeleting(null), 80)}>
              <input type="hidden" name="id" value={deleting?.id ?? ""} />
              <ActionButton className="btn btn-danger" spinnerSize={14}>
                Excluir
              </ActionButton>
            </form>
          </>
        }
      >
        <p className="prose-note line-clamp-4">{deleting?.body}</p>
      </Modal>
    </div>
  );
}

function NoteModal({
  open,
  onClose,
  note,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  note: NoteRow | null;
  projects: Array<{ id: string; name: string }>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveNoteAction, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: state.ok, tone: "success" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Modal open={open} onClose={onClose} title={note ? "Editar nota" : "Nova nota"} size="md">
      <form action={action} className="space-y-3.5">
        {note ? <input type="hidden" name="id" value={note.id} /> : null}
        <div className="field">
          <label className="label" htmlFor="note-title">
            Título
          </label>
          <input id="note-title" name="title" defaultValue={note?.title ?? ""} className="input" placeholder="Opcional" />
        </div>
        <div className="field">
          <label className="label" htmlFor="note-project">
            Projeto
          </label>
          <select id="note-project" name="project_id" defaultValue={note?.project_id ?? ""} className="select">
            <option value="">Nota avulsa</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="note-body">
            Nota <span className="text-[var(--bad)]">*</span>
          </label>
          <textarea id="note-body" name="body" defaultValue={note?.body ?? ""} rows={9} className="textarea" required data-autofocus />
        </div>
        <FormError message={state.error} />
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <SubmitButton className="btn btn-primary" pendingLabel="Salvando…">
            Salvar nota
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
