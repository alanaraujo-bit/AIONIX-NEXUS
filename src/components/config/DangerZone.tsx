"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { ActionButton } from "@/components/ui/ActionForm";
import { Modal } from "@/components/ui/Modal";
import { resetDataAction } from "@/lib/actions/catalog";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-danger btn-sm">
        <TriangleAlert size={13} />
        Apagar todos os projetos
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setTyped("");
        }}
        title="Apagar todos os projetos"
        description="Projetos, links, próximos passos, credenciais, notas, clientes, tags e histórico serão removidos."
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              Cancelar
            </button>
            <form action={resetDataAction} onSubmit={() => setTimeout(() => setOpen(false), 80)}>
              <input type="hidden" name="confirm" value={typed} />
              <ActionButton className="btn btn-danger" spinnerSize={14} disabled={typed !== "APAGAR"}>
                Apagar tudo
              </ActionButton>
            </form>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
            Não há como desfazer. Se ainda não exportou um backup, feche isto e exporte primeiro.
          </p>
          <div className="field">
            <label className="label" htmlFor="confirm-word">
              Digite <span className="mono font-semibold text-[var(--bad)]">APAGAR</span> para liberar o botão
            </label>
            <input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              className="input mono"
              autoComplete="off"
              data-autofocus
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
