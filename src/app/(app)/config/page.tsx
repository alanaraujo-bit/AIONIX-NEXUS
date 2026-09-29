import { Keyboard } from "lucide-react";

import { GeneralSettings } from "@/components/config/GeneralSettings";
import { requireUser } from "@/lib/auth";
import { allSettings } from "@/lib/db";
import { NAV_CONFIG, NAV_MAIN, NAV_SECONDARY } from "@/lib/nav";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

const SHORTCUTS: Array<[string, string]> = [
  ["⌘K / Ctrl K", "Abrir o Command Center"],
  ["/", "Buscar (mesma coisa, uma tecla)"],
  ["⇧N", "Novo projeto"],
  ["Esc", "Fechar modal, menu ou busca"],
  ["↑ ↓ + Enter", "Navegar e abrir resultados"],
];

export default async function ConfigGeralPage() {
  const user = await requireUser();
  const settings = await allSettings();

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <GeneralSettings ownerName={settings.owner_name ?? user.name} orgName={settings.org_name ?? "AIONIX"} />

      <section className="panel p-4 sm:p-5">
        <h2 className="h-section mb-1 flex items-center gap-2">
          <Keyboard size={13} />
          Atalhos de teclado
        </h2>
        <p className="mb-4 text-[0.6875rem] text-[var(--text-4)]">
          Pensados para tirar a mão do mouse. Funcionam em qualquer tela.
        </p>

        <ul className="divided">
          {SHORTCUTS.map(([keys, what]) => (
            <li key={keys} className="flex items-center justify-between gap-4 py-2">
              <span className="text-[0.8125rem] text-[var(--text-2)]">{what}</span>
              <kbd className="kbd flex-none px-2">{keys}</kbd>
            </li>
          ))}
        </ul>

        <h3 className="h-section mt-5 mb-2">Ir para (tecle g, depois)</h3>
        <ul className="grid grid-cols-2 gap-x-4">
          {[...NAV_MAIN, ...NAV_SECONDARY, ...NAV_CONFIG]
            .filter((n) => n.goKey)
            .map((n) => (
              <li key={n.href} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate text-[0.75rem] text-[var(--text-3)]">{n.label}</span>
                <kbd className="kbd flex-none">{n.goKey}</kbd>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
