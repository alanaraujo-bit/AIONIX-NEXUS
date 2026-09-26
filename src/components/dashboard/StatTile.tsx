import Link from "next/link";

import { Icon } from "@/components/Icon";
import type { Accent } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  icon,
  accent = "slate",
  href,
  hint,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: Accent;
  href?: string;
  hint?: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[7px] border"
          style={{
            background: "color-mix(in oklab, var(--ac) 11%, transparent)",
            borderColor: "color-mix(in oklab, var(--ac) 22%, transparent)",
            color: "var(--ac)",
          }}
        >
          <Icon name={icon} size={14} />
        </span>
        {emphasis && Number(value) > 0 ? (
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: "var(--ac)" }}
            />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--ac)" }} />
          </span>
        ) : null}
      </span>
      <span className="mt-3 block stat-value">{value}</span>
      <span className="mt-1 block truncate text-[0.6875rem] font-medium text-[var(--text-3)]">{label}</span>
      {hint ? <span className="mt-0.5 block truncate text-[0.625rem] text-[var(--text-4)]">{hint}</span> : null}
    </>
  );

  const cls = cn(
    `ac-${accent}`,
    "relative flex min-w-[8.25rem] flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-3.5 transition-all duration-150",
    href && "hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-sm)] active:scale-[0.985]",
  );

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
