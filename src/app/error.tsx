"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[NEXUS]", error);
  }, [error]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="cockpit-grid" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--bad)_28%,transparent)] bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] text-[var(--bad)]">
        <TriangleAlert size={22} />
      </span>
      <div className="relative space-y-2">
        <h1 className="h-display">Algo quebrou aqui</h1>
        <p className="mx-auto max-w-[46ch] text-[0.8125rem] leading-relaxed text-[var(--text-3)]">
          O NEXUS não conseguiu montar esta tela. Seus dados continuam intactos — tente de novo ou volte ao cockpit.
        </p>
        {error.digest ? (
          <p className="mono text-[0.625rem] text-[var(--text-4)]">referência {error.digest}</p>
        ) : null}
      </div>
      <div className="relative flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RotateCcw size={15} />
          Tentar de novo
        </button>
        <Link href="/" className="btn btn-default">
          Voltar ao cockpit
        </Link>
      </div>
    </main>
  );
}
