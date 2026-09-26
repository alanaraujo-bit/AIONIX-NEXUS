/**
 * Vocabulario do NEXUS: status, estagios, prioridades, tipos de link e a
 * paleta de acentos. Tudo que a interface rotula sai daqui — um unico lugar
 * para manter nomes, cores e ordem consistentes.
 */

export const STATUSES = ["active", "development", "paused", "completed", "idea"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<Status, { label: string; short: string; accent: Accent; hint: string }> = {
  active: { label: "Ativo", short: "Ativo", accent: "emerald", hint: "Em produção, rodando para usuários reais" },
  development: { label: "Em desenvolvimento", short: "Dev", accent: "blue", hint: "Sendo construído agora" },
  paused: { label: "Pausado", short: "Pausado", accent: "amber", hint: "Parado por decisão, retomável" },
  completed: { label: "Concluído", short: "Concluído", accent: "violet", hint: "Entregue e encerrado" },
  idea: { label: "Ideia", short: "Ideia", accent: "slate", hint: "Backlog, ainda não começou" },
};

export const STAGES = ["discovery", "design", "build", "beta", "launched", "maintenance"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_META: Record<Stage, { label: string; step: number }> = {
  discovery: { label: "Descoberta", step: 1 },
  design: { label: "Design", step: 2 },
  build: { label: "Construção", step: 3 },
  beta: { label: "Beta", step: 4 },
  launched: { label: "Lançado", step: 5 },
  maintenance: { label: "Manutenção", step: 6 },
};

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { label: string; accent: Accent; weight: number }> = {
  critical: { label: "Crítica", accent: "rose", weight: 4 },
  high: { label: "Alta", accent: "amber", weight: 3 },
  medium: { label: "Média", accent: "blue", weight: 2 },
  low: { label: "Baixa", accent: "slate", weight: 1 },
};

export const LINK_KINDS = [
  "production",
  "staging",
  "admin",
  "repo",
  "railway",
  "vercel",
  "docs",
  "database",
  "design",
  "analytics",
  "monitoring",
  "storage",
  "service",
  "custom",
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_KIND_META: Record<LinkKind, { label: string; icon: string; accent: Accent; group: string }> = {
  production: { label: "Produção", icon: "Globe", accent: "emerald", group: "Ambientes" },
  staging: { label: "Desenvolvimento", icon: "FlaskConical", accent: "blue", group: "Ambientes" },
  admin: { label: "Painel admin", icon: "ShieldCheck", accent: "violet", group: "Ambientes" },
  repo: { label: "Repositório", icon: "GitBranch", accent: "slate", group: "Código" },
  docs: { label: "Documentação", icon: "BookText", accent: "cyan", group: "Código" },
  design: { label: "Design", icon: "Palette", accent: "pink", group: "Código" },
  railway: { label: "Railway", icon: "Train", accent: "violet", group: "Infraestrutura" },
  vercel: { label: "Vercel", icon: "Triangle", accent: "slate", group: "Infraestrutura" },
  database: { label: "Banco de dados", icon: "Database", accent: "amber", group: "Infraestrutura" },
  storage: { label: "Armazenamento", icon: "HardDrive", accent: "cyan", group: "Infraestrutura" },
  monitoring: { label: "Monitoramento", icon: "Activity", accent: "rose", group: "Infraestrutura" },
  analytics: { label: "Analytics", icon: "ChartLine", accent: "emerald", group: "Infraestrutura" },
  service: { label: "Serviço externo", icon: "Plug", accent: "blue", group: "Serviços" },
  custom: { label: "Link", icon: "Link2", accent: "slate", group: "Serviços" },
};

export const LINK_GROUP_ORDER = ["Ambientes", "Código", "Infraestrutura", "Serviços"] as const;

export const ACCENTS = [
  "indigo",
  "blue",
  "cyan",
  "emerald",
  "amber",
  "orange",
  "rose",
  "pink",
  "violet",
  "slate",
] as const;
export type Accent = (typeof ACCENTS)[number];

export const ACCENT_LABEL: Record<Accent, string> = {
  indigo: "Índigo",
  blue: "Azul",
  cyan: "Ciano",
  emerald: "Esmeralda",
  amber: "Âmbar",
  orange: "Laranja",
  rose: "Rubro",
  pink: "Rosa",
  violet: "Violeta",
  slate: "Grafite",
};

export function isAccent(v: unknown): v is Accent {
  return typeof v === "string" && (ACCENTS as readonly string[]).includes(v);
}
export function asAccent(v: unknown, fallback: Accent = "slate"): Accent {
  return isAccent(v) ? v : fallback;
}
export function asStatus(v: unknown): Status {
  return (STATUSES as readonly string[]).includes(v as string) ? (v as Status) : "development";
}
export function asStage(v: unknown): Stage {
  return (STAGES as readonly string[]).includes(v as string) ? (v as Stage) : "build";
}
export function asPriority(v: unknown): Priority {
  return (PRIORITIES as readonly string[]).includes(v as string) ? (v as Priority) : "medium";
}
export function asLinkKind(v: unknown): LinkKind {
  return (LINK_KINDS as readonly string[]).includes(v as string) ? (v as LinkKind) : "custom";
}

/** Ícones do lucide liberados para projetos, categorias, clientes e ferramentas. */
export const ICON_CHOICES = [
  "Box", "Boxes", "Layers", "Rocket", "Zap", "Sparkles", "Bot", "BrainCircuit", "Cpu", "Terminal",
  "Code2", "Braces", "Database", "Server", "Cloud", "CloudCog", "Globe", "Network", "Radio", "Satellite",
  "ShoppingCart", "Store", "CreditCard", "Wallet", "Receipt", "TrendingUp", "ChartLine", "ChartPie", "Target", "Trophy",
  "Building2", "Briefcase", "Users", "UserRound", "Handshake", "Headset", "MessageSquare", "Mail", "Phone", "Calendar",
  "FileText", "BookText", "NotebookPen", "Folder", "Archive", "Tag", "Bookmark", "Star", "Flag", "Compass",
  "Gamepad2", "Tv", "Film", "Music", "Camera", "Image", "Palette", "PenTool", "Wand2", "Shapes",
  "Shield", "ShieldCheck", "Lock", "KeyRound", "Fingerprint", "Eye", "Bell", "Activity", "Gauge", "Radar",
  "Wrench", "Settings2", "SlidersHorizontal", "Plug", "Puzzle", "Blocks", "Hammer", "Cog", "GitBranch", "Container",
  "Truck", "Package", "MapPin", "Plane", "Train", "Car", "Home", "Factory", "Leaf", "Flame",
] as const;

export const KANBAN_STATUS_ORDER: Status[] = ["active", "development", "paused", "idea", "completed"];
