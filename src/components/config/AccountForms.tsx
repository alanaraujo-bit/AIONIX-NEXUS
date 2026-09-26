"use client";

import { useActionState, useEffect } from "react";
import { KeyRound, UserRound } from "lucide-react";

import { FormError, FormPending, SubmitButton } from "@/components/ui/Bits";
import { useToast } from "@/components/ui/Toast";
import { changePasswordAction, updateAccountAction, type AuthState } from "@/lib/actions/auth";

export function AccountForms({ name, email }: { name: string; email: string }) {
  const [accountState, accountAction] = useActionState<AuthState, FormData>(updateAccountAction, {});
  const [pwState, pwAction] = useActionState<AuthState, FormData>(changePasswordAction, {});
  const { toast } = useToast();

  useEffect(() => {
    if (accountState.ok) toast({ title: accountState.ok, tone: "success" });
  }, [accountState, toast]);

  useEffect(() => {
    if (pwState.ok) toast({ title: "Senha alterada", description: pwState.ok, tone: "success" });
  }, [pwState, toast]);

  return (
    <div className="space-y-5">
      <section className="panel relative overflow-hidden p-4 sm:p-5">
        <FormPending />
        <h2 className="h-section mb-4 flex items-center gap-2">
          <UserRound size={13} />
          Operador
        </h2>
        <form action={accountAction} className="space-y-3.5">
          <div className="field">
            <label className="label" htmlFor="acc-name">
              Nome
            </label>
            <input id="acc-name" name="name" defaultValue={name} className="input" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-email">
              E-mail de acesso
            </label>
            <input id="acc-email" name="email" type="email" defaultValue={email} className="input" required />
          </div>
          <FormError message={accountState.error} />
          <div className="flex justify-end">
            <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Salvando…">
              Salvar
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="panel relative overflow-hidden p-4 sm:p-5">
        <h2 className="h-section mb-4 flex items-center gap-2">
          <KeyRound size={13} />
          Trocar senha
        </h2>
        <form action={pwAction} className="space-y-3.5">
          <div className="field">
            <label className="label" htmlFor="pw-current">
              Senha atual
            </label>
            <input id="pw-current" name="current" type="password" autoComplete="current-password" className="input" required />
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="field">
              <label className="label" htmlFor="pw-new">
                Nova senha
              </label>
              <input
                id="pw-new"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                className="input"
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="pw-confirm">
                Confirmar
              </label>
              <input
                id="pw-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={10}
                className="input"
                required
              />
            </div>
          </div>
          <p className="hint">Mínimo de 10 caracteres. O hash usa scrypt com sal por usuário.</p>
          <FormError message={pwState.error} />
          <div className="flex justify-end">
            <SubmitButton className="btn btn-default btn-sm" pendingLabel="Alterando…">
              Alterar senha
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
