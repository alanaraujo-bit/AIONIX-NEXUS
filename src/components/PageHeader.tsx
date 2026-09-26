import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  crumbs,
  meta,
  className,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  crumbs?: Crumb[];
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6", className)}>
      {crumbs?.length ? (
        <nav aria-label="Trilha" className="mb-2.5 flex items-center gap-1 text-xs text-[var(--text-4)]">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight size={12} className="opacity-60" /> : null}
              {c.href ? (
                <Link href={c.href} className="link-quiet">
                  {c.label}
                </Link>
              ) : (
                <span className="text-[var(--text-3)]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="h-section mb-1.5">{eyebrow}</p> : null}
          <h1 className="h-display text-balance">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[var(--text-3)]">{description}</p>
          ) : null}
          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
