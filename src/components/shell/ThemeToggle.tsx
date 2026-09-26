"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Segmented } from "@/components/ui/Bits";
import { cn } from "@/lib/utils";

type Pref = "light" | "dark" | "system";

function apply(pref: Pref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.dataset.themePref = pref;
  try {
    localStorage.setItem("nexus-theme", pref);
  } catch {
    /* modo privado */
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#07080b" : "#f4f5f7");
}

export function useThemePref(): [Pref, (p: Pref) => void] {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("nexus-theme") as Pref | null) ?? "system";
    setPref(stored);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("nexus-theme") as Pref | null) === "system" || !localStorage.getItem("nexus-theme")) {
        apply("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return [
    pref,
    (p: Pref) => {
      setPref(p);
      apply(p);
    },
  ];
}

const OPTIONS = [
  { value: "light" as const, label: "", icon: <Sun size={13} />, title: "Claro" },
  { value: "dark" as const, label: "", icon: <Moon size={13} />, title: "Escuro" },
  { value: "system" as const, label: "", icon: <Monitor size={13} />, title: "Sistema" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useThemePref();
  return (
    <div className={cn(className)}>
      <Segmented value={pref} onChange={setPref} options={OPTIONS} size="sm" ariaLabel="Tema" />
    </div>
  );
}

/** Versão de um botão só, para a barra superior no mobile. */
export function ThemeCycleButton() {
  const [pref, setPref] = useThemePref();
  const next: Record<Pref, Pref> = { system: "light", light: "dark", dark: "system" };
  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;
  const label = pref === "light" ? "Tema claro" : pref === "dark" ? "Tema escuro" : "Tema do sistema";
  return (
    <button
      type="button"
      onClick={() => setPref(next[pref])}
      className="btn btn-ghost btn-icon btn-sm"
      title={`${label} — tocar para alternar`}
      aria-label={label}
    >
      <Icon size={15} />
    </button>
  );
}
