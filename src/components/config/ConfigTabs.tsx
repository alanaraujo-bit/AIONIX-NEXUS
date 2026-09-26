"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
import { CONFIG_TABS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function ConfigTabs() {
  const pathname = usePathname();
  return (
    <nav className="scroll-x -mx-4 border-b border-[var(--line)] px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-1">
        {CONFIG_TABS.map((tab) => {
          const on = isActive(pathname, tab);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center gap-2 rounded-t-[var(--radius-sm)] px-3 text-[0.8125rem] font-medium transition-colors",
                  on ? "text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]",
                )}
              >
                <Icon name={tab.icon} size={14} className={on ? "text-[var(--accent)]" : undefined} />
                {tab.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--accent)] transition-transform duration-200",
                    on ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
