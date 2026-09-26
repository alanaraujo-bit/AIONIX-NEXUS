export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Atalho de teclado (sequência após "g"). */
  goKey?: string;
  exact?: boolean;
  mobile?: boolean;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Cockpit", icon: "Gauge", goKey: "h", exact: true, mobile: true },
  { href: "/foco", label: "Foco", icon: "Target", goKey: "f", mobile: true },
  { href: "/projetos", label: "Projetos", icon: "Boxes", goKey: "p", mobile: true },
  { href: "/atalhos", label: "Acesso rápido", icon: "Zap", goKey: "a", mobile: true },
];

export const NAV_SECONDARY: NavItem[] = [
  { href: "/clientes", label: "Clientes", icon: "Building2", goKey: "c" },
  { href: "/notas", label: "Notas", icon: "NotebookPen", goKey: "n" },
  { href: "/atividade", label: "Atividade", icon: "Activity", goKey: "t" },
  { href: "/links", label: "Saúde dos links", icon: "Radar", goKey: "l" },
];

export const NAV_CONFIG: NavItem[] = [{ href: "/config", label: "Configurações", icon: "Settings2", goKey: "s" }];

export const CONFIG_TABS: NavItem[] = [
  { href: "/config", label: "Geral", icon: "SlidersHorizontal", exact: true },
  { href: "/config/categorias", label: "Categorias", icon: "Layers" },
  { href: "/config/tags", label: "Tags", icon: "Tag" },
  { href: "/config/clientes", label: "Clientes", icon: "Building2" },
  { href: "/config/ferramentas", label: "Ferramentas", icon: "Wrench" },
  { href: "/config/conta", label: "Conta e sessões", icon: "Fingerprint" },
  { href: "/config/dados", label: "Dados", icon: "Database" },
];

const seen = new Set<string>();
export const ALL_NAV: NavItem[] = [...NAV_MAIN, ...NAV_SECONDARY, ...NAV_CONFIG, ...CONFIG_TABS].filter((item) => {
  if (seen.has(item.href)) return false;
  seen.add(item.href);
  return true;
});

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
