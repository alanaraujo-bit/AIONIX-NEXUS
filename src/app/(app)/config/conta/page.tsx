import { LogOut, Monitor, ShieldCheck } from "lucide-react";

import { AccountForms } from "@/components/config/AccountForms";
import { ActionButton, ActionForm } from "@/components/ui/ActionForm";
import { revokeAllSessionsAction, revokeSessionAction } from "@/lib/actions/auth";
import { listSessions, requireUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const metadata = { title: "Conta e sessões" };
export const dynamic = "force-dynamic";

/** Resume o user-agent num rótulo legível. */
function describeAgent(ua: string | null): string {
  if (!ua) return "Dispositivo desconhecido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ");
}

export default async function ContaPage() {
  const user = await requireUser();
  const sessions = await listSessions(user.id);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <AccountForms name={user.name} email={user.email} />

      <section className="panel overflow-hidden">
        <div className="p-4 sm:p-5">
          <h2 className="h-section mb-1 flex items-center gap-2">
            <Monitor size={13} />
            Sessões ativas
          </h2>
          <p className="text-[0.6875rem] text-[var(--text-4)]">
            Cada login cria uma sessão de 30 dias. Encerre as que você não reconhece.
          </p>
        </div>

        <ul className="divided border-t border-[var(--line-soft)]">
          {sessions.map((s) => (
            <li key={s.id} className="row flex items-center gap-3 px-4 py-3">
              <span
                className="h-6 w-1 flex-none rounded-full"
                style={{ background: s.current ? "var(--ok)" : "var(--line-strong)" }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[0.8125rem] font-medium">{describeAgent(s.user_agent)}</span>
                  {s.current ? <span className="ac-emerald chip chip-tone">Esta sessão</span> : null}
                </span>
                <span className="mt-0.5 block text-[0.625rem] text-[var(--text-4)]">
                  Ativa {relativeTime(s.last_seen_at)} · criada em {formatDateTime(s.created_at)}
                </span>
              </span>
              {!s.current ? (
                <ActionForm action={revokeSessionAction} fields={{ id: s.id }}>
                  <ActionButton className="btn btn-ghost btn-sm text-[var(--text-3)] hover:text-[var(--bad)]">
                    Encerrar
                  </ActionButton>
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--line-soft)] bg-[var(--surface-2)] p-3.5">
          <form action={revokeAllSessionsAction}>
            <ActionButton className="btn btn-danger btn-sm" spinnerSize={13}>
              <LogOut size={13} />
              Encerrar todas as sessões
            </ActionButton>
          </form>
          <p className="mt-2 flex items-start gap-1.5 text-[0.625rem] leading-relaxed text-[var(--text-4)]">
            <ShieldCheck size={11} className="mt-px flex-none" />
            Tokens de sessão ficam guardados só como hash. Nem o banco nem a interface veem o valor original.
          </p>
        </div>
      </section>
    </div>
  );
}
