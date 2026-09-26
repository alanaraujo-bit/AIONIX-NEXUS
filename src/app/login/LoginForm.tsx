"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { LogoMark } from "@/components/Logo";
import { FormError, FormPending, SubmitButton } from "@/components/ui/Bits";
import { loginAction, setupAction, type AuthState } from "@/lib/actions/auth";

export function LoginForm({ needsSetup, next = "/" }: { needsSetup: boolean; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(needsSetup ? setupAction : loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <div className="anim-rise relative w-full max-w-[24.5rem]">
      <div className="mb-8 flex flex-col items-center text-center">
        <LogoMark size={40} className="text-[var(--accent)]" />
        <h1 className="mt-4 text-[1.375rem] font-semibold tracking-[-0.03em]">AIONIX NEXUS</h1>
        <p className="mt-1.5 text-[0.8125rem] text-[var(--text-3)]">
          {needsSetup ? "Primeiro acesso — defina o operador." : "Centro de comando do ecossistema."}
        </p>
      </div>

      <form action={action} className="panel relative overflow-hidden p-5 shadow-[var(--shadow-lg)]">
        <FormPending />

        <input type="hidden" name="next" value={next} />

        <div className="space-y-3.5">
          {needsSetup ? (
            <div className="field">
              <label className="label" htmlFor="name">
                Nome
              </label>
              <input id="name" name="name" className="input input-lg" placeholder="Alan" autoComplete="name" required />
            </div>
          ) : null}

          <div className="field">
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              className="input input-lg"
              placeholder="voce@aionix.com"
              required
              data-autofocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete={needsSetup ? "new-password" : "current-password"}
                className="input input-lg pr-10"
                placeholder="••••••••••"
                required
                minLength={needsSetup ? 10 : undefined}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-2 text-[var(--text-4)] transition-colors hover:text-[var(--text-2)]"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {needsSetup ? <p className="hint">Mínimo de 10 caracteres.</p> : null}
          </div>

          {needsSetup ? (
            <div className="field">
              <label className="label" htmlFor="confirm">
                Confirmar senha
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                className="input input-lg"
                required
              />
            </div>
          ) : null}

          <FormError message={state.error} />

          <SubmitButton className="btn btn-primary btn-lg btn-block mt-1" pendingLabel="Verificando…">
            {needsSetup ? "Criar acesso" : "Entrar"}
            <ArrowRight size={15} />
          </SubmitButton>
        </div>
      </form>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[0.6875rem] text-[var(--text-4)]">
        <ShieldCheck size={12} />
        Sessão assinada, cookie httpOnly e limite de tentativas.
      </p>
    </div>
  );
}
