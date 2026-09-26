"use client";

import { useActionState, useEffect } from "react";

import { FormError, FormPending, SubmitButton } from "@/components/ui/Bits";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { saveSettingsAction, type ActionState } from "@/lib/actions/catalog";

export function GeneralSettings({ ownerName, orgName }: { ownerName: string; orgName: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettingsAction, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast({ title: state.ok, tone: "success" });
  }, [state, toast]);

  return (
    <section className="panel relative overflow-hidden p-4 sm:p-5">
      <FormPending />
      <h2 className="h-section mb-1">Identidade do painel</h2>
      <p className="mb-4 text-[0.6875rem] text-[var(--text-4)]">
        Como o NEXUS chama você e sua operação.
      </p>

      <form action={action} className="space-y-3.5">
        <div className="field">
          <label className="label" htmlFor="owner_name">
            Seu nome
          </label>
          <input id="owner_name" name="owner_name" defaultValue={ownerName} className="input" maxLength={40} />
          <p className="hint">Usado na saudação do cockpit.</p>
        </div>

        <div className="field">
          <label className="label" htmlFor="org_name">
            Nome da operação
          </label>
          <input id="org_name" name="org_name" defaultValue={orgName} className="input" maxLength={40} />
        </div>

        <FormError message={state.error} />

        <div className="flex justify-end">
          <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Salvando…">
            Salvar
          </SubmitButton>
        </div>
      </form>

      <div className="mt-5 border-t border-[var(--line-soft)] pt-4">
        <h3 className="h-section mb-1">Tema</h3>
        <p className="mb-3 text-[0.6875rem] text-[var(--text-4)]">
          Claro e escuro foram desenhados separadamente. “Sistema” acompanha a preferência do seu aparelho.
        </p>
        <ThemeToggle />
      </div>
    </section>
  );
}
