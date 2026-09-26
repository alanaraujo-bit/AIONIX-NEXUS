"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, Copy, MoreHorizontal, Pencil, Pin, Star, Trash2 } from "lucide-react";

import { PriorityBars, StatusChip } from "@/components/Badges";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import {
  deleteProjectAction,
  duplicateProjectAction,
  setProjectFieldAction,
  toggleProjectFlagAction,
} from "@/lib/actions/projects";
import { PRIORITIES, PRIORITY_META, STAGES, STAGE_META, STATUSES, STATUS_META } from "@/lib/domain";
import type { ProjectDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

function fire(action: (fd: FormData) => void | Promise<void>, fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  void action(fd);
}

export function ProjectQuickState({ project }: { project: ProjectDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Menu
        align="start"
        sheetTitle="Status"
        items={STATUSES.map((s) => ({
          key: s,
          label: STATUS_META[s].label,
          checked: s === project.status,
          onSelect: () => fire(setProjectFieldAction, { id: project.id, field: "status", value: s }),
        }))}
        trigger={
          <button type="button" className="group inline-flex items-center gap-1 rounded-[var(--radius-xs)] transition-opacity hover:opacity-80" title="Alterar status">
            <StatusChip status={project.status} />
            <ChevronDown size={11} className="text-[var(--text-4)]" />
          </button>
        }
      />

      <Menu
        align="start"
        sheetTitle="Prioridade"
        items={PRIORITIES.map((p) => ({
          key: p,
          label: PRIORITY_META[p].label,
          checked: p === project.priority,
          onSelect: () => fire(setProjectFieldAction, { id: project.id, field: "priority", value: p }),
        }))}
        trigger={
          <button
            type="button"
            className={cn(`ac-${PRIORITY_META[project.priority].accent}`, "chip chip-tone gap-1.5")}
            title="Alterar prioridade"
          >
            <PriorityBars weight={PRIORITY_META[project.priority].weight} />
            {PRIORITY_META[project.priority].label}
            <ChevronDown size={10} className="opacity-60" />
          </button>
        }
      />

      <Menu
        align="start"
        sheetTitle="Estágio"
        items={STAGES.map((s) => ({
          key: s,
          label: STAGE_META[s].label,
          checked: s === project.stage,
          onSelect: () => fire(setProjectFieldAction, { id: project.id, field: "stage", value: s }),
        }))}
        trigger={
          <button type="button" className="chip chip-quiet gap-1.5" title="Alterar estágio">
            {STAGE_META[project.stage].label}
            <ChevronDown size={10} className="opacity-60" />
          </button>
        }
      />
    </div>
  );
}

export function ProjectHeaderActions({ project }: { project: ProjectDetail }) {
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <ActionForm action={toggleProjectFlagAction} fields={{ id: project.id, field: "is_favorite" }}>
        <ActionButton
          className={cn("btn btn-default btn-icon", project.is_favorite && "text-[var(--warn)]")}
          title={project.is_favorite ? "Remover dos favoritos" : "Marcar como favorito"}
          spinnerSize={14}
        >
          <Star size={15} fill={project.is_favorite ? "currentColor" : "none"} />
        </ActionButton>
      </ActionForm>

      <ActionForm action={toggleProjectFlagAction} fields={{ id: project.id, field: "is_pinned" }}>
        <ActionButton
          className={cn("btn btn-default btn-icon", project.is_pinned && "text-[var(--accent)]")}
          title={project.is_pinned ? "Desafixar do cockpit" : "Fixar no cockpit"}
          spinnerSize={14}
        >
          <Pin size={15} fill={project.is_pinned ? "currentColor" : "none"} />
        </ActionButton>
      </ActionForm>

      <Menu
        align="end"
        sheetTitle={project.name}
        items={[
          { key: "edit", label: "Editar projeto", icon: <Pencil size={14} />, href: `/projetos/${project.slug}/editar` },
          {
            key: "dup",
            label: "Duplicar",
            icon: <Copy size={14} />,
            onSelect: () => fire(duplicateProjectAction, { id: project.id }),
          },
          {
            key: "arch",
            label: project.is_archived ? "Tirar do arquivo" : "Arquivar",
            icon: project.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
            separatorBefore: true,
            onSelect: () =>
              fire(setProjectFieldAction, {
                id: project.id,
                field: "is_archived",
                value: project.is_archived ? "0" : "1",
              }),
          },
          {
            key: "del",
            label: "Excluir projeto",
            icon: <Trash2 size={14} />,
            danger: true,
            onSelect: () => setDeleting(true),
          },
        ]}
        trigger={
          <button type="button" className="btn btn-default btn-icon" title="Mais ações">
            <MoreHorizontal size={16} />
          </button>
        }
      />

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Excluir ${project.name}`}
        description="Links, passos, notas, credenciais e histórico deste projeto serão apagados."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(false)}>
              Cancelar
            </button>
            <form action={deleteProjectAction}>
              <input type="hidden" name="id" value={project.id} />
              <ActionButton className="btn btn-danger" spinnerSize={14}>
                Excluir definitivamente
              </ActionButton>
            </form>
          </>
        }
      >
        <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
          Se a ideia é só tirar da frente, prefira <strong className="font-medium text-[var(--text)]">arquivar</strong> —
          o projeto some das listas mas continua consultável.
        </p>
      </Modal>
    </>
  );
}

/** Ajuste rápido de progresso direto na página do projeto. */
export function ProgressControl({ projectId, value }: { projectId: string; value: number }) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);

  function commit(next: number) {
    setLocal(next);
    setSaving(true);
    const fd = new FormData();
    fd.set("id", projectId);
    fd.set("field", "progress");
    fd.set("value", String(next));
    Promise.resolve(setProjectFieldAction(fd)).finally(() => setSaving(false));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[0.6875rem] text-[var(--text-3)]">Progresso</span>
        <span className="num text-[0.8125rem] font-semibold" style={{ opacity: saving ? 0.5 : 1 }}>
          {local}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-3)] accent-[var(--accent)]"
        aria-label="Progresso do projeto"
      />
    </div>
  );
}
