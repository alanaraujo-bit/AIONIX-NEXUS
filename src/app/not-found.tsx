import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Não encontrado" };

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="cockpit-grid" />
      <LogoMark size={34} className="relative text-[var(--text-4)]" />
      <div className="relative space-y-2">
        <p className="mono text-[0.6875rem] tracking-[0.2em] text-[var(--text-4)] uppercase">Erro 404</p>
        <h1 className="h-display">Esta rota não existe</h1>
        <p className="mx-auto max-w-[44ch] text-[0.8125rem] leading-relaxed text-[var(--text-3)]">
          O projeto pode ter sido renomeado, excluído ou o endereço veio com um erro de digitação.
        </p>
      </div>
      <div className="relative flex flex-wrap items-center justify-center gap-2">
        <Link href="/" className="btn btn-primary">
          <ArrowLeft size={15} />
          Voltar ao cockpit
        </Link>
        <Link href="/projetos" className="btn btn-default">
          <Compass size={15} />
          Ver todos os projetos
        </Link>
      </div>
    </main>
  );
}
