"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu as MenuIcon, Plus, Search, User2, X } from "lucide-react";

import { Icon } from "@/components/Icon";
import { Wordmark } from "@/components/Logo";
import { Menu } from "@/components/ui/Menu";
import { NAV_CONFIG, NAV_MAIN, NAV_SECONDARY, isActive, type NavItem } from "@/lib/nav";
import type { SearchEntry } from "@/lib/search-types";
import { cn, initials } from "@/lib/utils";

import { CommandPalette, type CommandAction } from "./CommandPalette";
import { ThemeCycleButton, ThemeToggle } from "./ThemeToggle";

interface Props {
  user: { name: string; email: string };
  index: SearchEntry[];
  actions: CommandAction[];
  recent: SearchEntry[];
  counts: Record<string, number>;
  children: React.ReactNode;
}

export function AppShell({ user, index, actions, recent, counts, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);

  // ⌘K / Ctrl+K e navegação por "g <tecla>"
  useEffect(() => {
    let goMode = false;
    let goTimer: ReturnType<typeof setTimeout> | null = null;

    const typing = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      return (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable === true
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (goMode) {
        const item = [...NAV_MAIN, ...NAV_SECONDARY, ...NAV_CONFIG].find((n) => n.goKey === e.key.toLowerCase());
        goMode = false;
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }
      if (e.key.toLowerCase() === "g") {
        goMode = true;
        if (goTimer) clearTimeout(goTimer);
        goTimer = setTimeout(() => (goMode = false), 1400);
        return;
      }
      if (e.key.toLowerCase() === "n" && e.shiftKey) {
        e.preventDefault();
        router.push("/projetos/novo");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (goTimer) clearTimeout(goTimer);
    };
  }, [router]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  const userMenu = useMemo(
    () => [
      { key: "conta", label: "Conta e sessões", icon: <User2 size={14} />, href: "/config/conta" },
      { key: "config", label: "Configurações", icon: <Icon name="Settings2" size={14} />, href: "/config" },
      {
        key: "sair",
        label: "Encerrar sessão",
        icon: <LogOut size={14} />,
        danger: true,
        separatorBefore: true,
        onSelect: () => {
          const f = document.getElementById("nexus-logout") as HTMLFormElement | null;
          f?.requestSubmit();
        },
      },
    ],
    [],
  );

  return (
    <div className="relative min-h-dvh">
      <div className="cockpit-grid" />

      {/* ------------------------------------------------ sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-[var(--line)] bg-[var(--surface)] lg:flex">
        <SidebarContent
          pathname={pathname}
          counts={counts}
          user={user}
          userMenu={userMenu}
          onSearch={openPalette}
        />
      </aside>

      {/* ------------------------------------------------- gaveta (tablet) */}
      {drawer ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="anim-fade absolute inset-0 bg-[var(--scrim)]" onClick={() => setDrawer(false)} />
          <aside className="anim-drawer absolute inset-y-0 left-0 flex w-[16.5rem] flex-col border-r border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
            <SidebarContent
              pathname={pathname}
              counts={counts}
              user={user}
              userMenu={userMenu}
              onSearch={() => {
                setDrawer(false);
                openPalette();
              }}
              onClose={() => setDrawer(false)}
            />
          </aside>
        </div>
      ) : null}

      {/* -------------------------------------------------------- conteúdo */}
      <div className="relative z-10 lg:pl-[15.5rem]">
        {/* topo mobile / tablet */}
        <header className="safe-t sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface-glass)] backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center gap-1.5 px-3">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="btn btn-ghost btn-icon"
              aria-label="Abrir menu"
            >
              <MenuIcon size={18} />
            </button>
            <Link href="/" className="flex items-center" aria-label="Cockpit">
              <Wordmark compact />
            </Link>
            <span className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                onClick={openPalette}
                className="btn btn-ghost btn-icon"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>
              <ThemeCycleButton />
              <Link href="/projetos/novo" className="btn btn-primary btn-icon btn-sm ml-1" aria-label="Novo projeto">
                <Plus size={16} />
              </Link>
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:px-8 lg:pt-7 lg:pb-14 3xl:max-w-[112rem]">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------ barra inferior */}
      <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface-glass)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch">
          {NAV_MAIN.filter((n) => n.mobile).map((item) => {
            const on = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200",
                    on ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-3)]",
                  )}
                >
                  <Icon name={item.icon} size={18} strokeWidth={on ? 2.1 : 1.75} />
                </span>
                <span
                  className={cn(
                    "text-[0.625rem] leading-none font-medium tracking-tight",
                    on ? "text-[var(--text)]" : "text-[var(--text-4)]",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <Menu
            sheetTitle="Mais"
            align="end"
            items={[
              ...NAV_SECONDARY.map((n) => ({
                key: n.href,
                label: n.label,
                icon: <Icon name={n.icon} size={15} />,
                href: n.href,
              })),
              {
                key: "config",
                label: "Configurações",
                icon: <Icon name="Settings2" size={15} />,
                href: "/config",
                separatorBefore: true,
              },
              ...userMenu.slice(2),
            ]}
            trigger={
              <button type="button" className="relative flex flex-1 flex-col items-center gap-1 py-2.5">
                <span className="flex h-7 w-12 items-center justify-center rounded-full text-[var(--text-3)]">
                  <Icon name="Grid2x2" size={18} />
                </span>
                <span className="text-[0.625rem] leading-none font-medium text-[var(--text-4)]">Mais</span>
              </button>
            }
          />
        </div>
      </nav>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        index={index}
        actions={actions}
        recent={recent}
      />
    </div>
  );
}

/* ------------------------------------------------------------- sidebar --- */

function SidebarContent({
  pathname,
  counts,
  user,
  userMenu,
  onSearch,
  onClose,
}: {
  pathname: string;
  counts: Record<string, number>;
  user: { name: string; email: string };
  userMenu: Parameters<typeof Menu>[0]["items"];
  onSearch: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex h-14 flex-none items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center" aria-label="Cockpit">
          <Wordmark />
        </Link>
        {onClose ? (
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Fechar menu">
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex-none px-3 pb-3">
        <button
          type="button"
          onClick={onSearch}
          className="group flex h-9 w-full items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-inset)] px-2.5 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-3)]"
        >
          <Search size={14} className="flex-none text-[var(--text-4)]" />
          <span className="flex-1 text-[0.8125rem] text-[var(--text-4)]">Buscar…</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        <NavGroup items={NAV_MAIN} pathname={pathname} counts={counts} />
        <NavGroup label="Operação" items={NAV_SECONDARY} pathname={pathname} counts={counts} />
      </nav>

      <div className="flex-none space-y-3 border-t border-[var(--line-soft)] p-3">
        <Link
          href="/projetos/novo"
          className="btn btn-default btn-block justify-start gap-2 text-[var(--text-2)]"
        >
          <Plus size={15} />
          Novo projeto
          <kbd className="kbd ml-auto">⇧N</kbd>
        </Link>

        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <Menu
            align="end"
            items={userMenu}
            sheetTitle={user.name}
            trigger={
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] p-1 transition-colors hover:bg-[var(--surface-3)]"
                aria-label="Menu da conta"
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.6875rem] font-semibold text-[var(--accent)]">
                  {initials(user.name)}
                </span>
              </button>
            }
          />
        </div>
      </div>
    </>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  counts,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
  counts: Record<string, number>;
}) {
  return (
    <div>
      {label ? <p className="mb-1.5 px-2.5 text-[0.625rem] font-semibold tracking-[0.1em] text-[var(--text-4)] uppercase">{label}</p> : null}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const on = isActive(pathname, item);
          const count = counts[item.href];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[0.8125rem] font-medium transition-colors",
                  on
                    ? "bg-[var(--accent-soft)] text-[var(--text)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 -left-3 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] transition-all duration-200",
                    on ? "opacity-100" : "scale-y-0 opacity-0",
                  )}
                />
                <Icon
                  name={item.icon}
                  size={15}
                  className={cn("flex-none transition-colors", on ? "text-[var(--accent)]" : "text-[var(--text-3)]")}
                  strokeWidth={on ? 2 : 1.75}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {count ? (
                  <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.625rem] font-semibold text-[var(--text-3)] tabular-nums">
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
