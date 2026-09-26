"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Calendar, Check, Plus, Trash2 } from "lucide-react";

import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { EmptyState, SubmitButton } from "@/components/ui/Bits";
import { useToast } from "@/components/ui/Toast";
import {
  addStepAction,
  deleteStepAction,
  toggleStepAction,
  type ActionState,
} from "@/lib/actions/projects";
import type { ProjectStep } from "@/lib/types";
import { cn, daysUntil, formatDate } from "@/lib/utils";

export function StepsPanel({ projectId, steps }: { projectId: string; steps: ProjectStep[] }) {
  const [state, action] = useActionState<ActionState, FormData>(addStepAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAdding(false);
    }
    if (state.error) toast({ title: state.error, tone: "error" });
  }, [state, toast]);

  const open = steps.filter((s) => !s.done);
  const done = steps.filter((s) => s.done);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-4 py-3">
        <h2 className="h-section">Próximos passos</h2>
        {open.length > 0 ? (
          <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)]">
            {open.length}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="btn btn-ghost btn-sm ml-auto"
          aria-expanded={adding}
        >
          <Plus size={13} />
          Adicionar
        </button>
      </div>

      {adding ? (
        <form ref={formRef} action={action} className="anim-rise space-y-2.5 border-b border-[var(--line-soft)] bg-[var(--surface-2)] p-3.5">
          <input type="hidden" name="project_id" value={projectId} />
          <input
            name="title"
            className="input"
            placeholder="O que precisa acontecer em seguida?"
            required
            maxLength={160}
            data-autofocus
            autoFocus
          />
          <div className="flex items-center gap-2">
            <label className="label flex items-center gap-1.5 text-[var(--text-3)]" htmlFor="due_at">
              <Calendar size={12} />
              Prazo
            </label>
            <input id="due_at" name="due_at" type="date" className="input h-8 w-auto text-xs" />
            <SubmitButton className="btn btn-primary btn-sm ml-auto" pendingLabel="Salvando…">
              Adicionar
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {steps.length === 0 && !adding ? (
        <EmptyState
          icon={<Check size={18} />}
          title="Nenhum passo definido"
          description="Um projeto sem próximo passo entra na lista de atenção."
          action={
            <button type="button" onClick={() => setAdding(true)} className="btn btn-default btn-sm">
              <Plus size={13} />
              Definir próximo passo
            </button>
          }
          compact
        />
      ) : (
        <ul className="divided">
          {[...open, ...done].map((step) => {
            const left = step.due_at ? daysUntil(step.due_at) : null;
            const overdue = !step.done && left !== null && left < 0;
            const soon = !step.done && left !== null && left >= 0 && left <= 3;
            return (
              <li key={step.id} className="row group flex items-center gap-3 px-3.5 py-2.5">
                <ActionForm action={toggleStepAction} fields={{ id: step.id }}>
                  <ActionButton
                    className={cn(
                      "flex h-[1.125rem] w-[1.125rem] flex-none items-center justify-center rounded-[5px] border transition-all duration-150",
                      step.done
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border-[var(--line-strong)] hover:border-[var(--accent)]",
                    )}
                    title={step.done ? "Reabrir" : "Concluir"}
                    spinnerSize={10}
                  >
                    {step.done ? <Check size={11} strokeWidth={3} /> : <span />}
                  </ActionButton>
                </ActionForm>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[0.8125rem] leading-snug",
                      step.done && "text-[var(--text-4)] line-through",
                    )}
                  >
                    {step.title}
                  </span>
                  {step.due_at ? (
                    <span
                      className="mt-0.5 flex items-center gap-1 text-[0.625rem]"
                      style={{ color: overdue ? "var(--bad)" : soon ? "var(--warn)" : "var(--text-4)" }}
                    >
                      <Calendar size={9} />
                      {formatDate(step.due_at)}
                      {overdue ? ` · atrasado ${Math.abs(left!)} d` : soon ? ` · em ${left} d` : ""}
                    </span>
                  ) : null}
                </span>

                <ActionForm action={deleteStepAction} fields={{ id: step.id }}>
                  <ActionButton
                    className="btn btn-ghost btn-icon btn-sm text-[var(--text-4)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-[var(--bad)]"
                    title="Remover passo"
                  >
                    <Trash2 size={13} />
                  </ActionButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
