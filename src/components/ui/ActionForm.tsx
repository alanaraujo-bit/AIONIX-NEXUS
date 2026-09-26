"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Modal } from "./Modal";

type ServerAction = (formData: FormData) => void | Promise<void>;

/** Formulário mínimo para uma ação de servidor, com campos ocultos. */
export function ActionForm({
  action,
  fields,
  children,
  className,
}: {
  action: ServerAction;
  fields: Record<string, string | number | undefined | null>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={action} className={cn("contents", className)}>
      {Object.entries(fields).map(([k, v]) =>
        v === undefined || v === null ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
      )}
      {children}
    </form>
  );
}

/** Botão de submit que mostra estado de envio no lugar do ícone. */
export function ActionButton({
  children,
  className = "btn btn-ghost btn-icon btn-sm",
  title,
  spinnerSize = 13,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  spinnerSize?: number;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} title={title} aria-label={title} disabled={pending} {...rest}>
      {pending ? <Loader2 size={spinnerSize} className="spin" /> : children}
    </button>
  );
}

/** Ação destrutiva com confirmação em modal. */
export function ConfirmAction({
  action,
  fields,
  title,
  description,
  confirmLabel = "Excluir",
  trigger,
  tone = "danger",
}: {
  action: ServerAction;
  fields: Record<string, string | number | undefined | null>;
  title: string;
  description: string;
  confirmLabel?: string;
  trigger: (open: () => void) => React.ReactNode;
  tone?: "danger" | "default";
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <form
              ref={formRef}
              action={action}
              onSubmit={() => setTimeout(() => setOpen(false), 80)}
            >
              {Object.entries(fields).map(([k, v]) =>
                v === undefined || v === null ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
              )}
              <ActionButton className={tone === "danger" ? "btn btn-danger" : "btn btn-primary"} spinnerSize={14}>
                {confirmLabel}
              </ActionButton>
            </form>
          </>
        }
      >
        <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
          Essa ação não pode ser desfeita.
        </p>
      </Modal>
    </>
  );
}
