/**
 * Conjunto de demonstração. Serve para o NEXUS não abrir vazio e para você ver
 * como um portfólio preenchido se comporta. Tudo aqui é fictício (exceto
 * AIONIX PLAY, que já existe na sua máquina) e pode ser apagado de uma vez em
 * Configurações › Dados.
 */

import type { LinkKind, Priority, Stage, Status } from "./domain.ts";

export interface SeedLink {
  kind: LinkKind;
  label?: string;
  url: string;
  note?: string;
  primary?: boolean;
  monitor?: boolean;
}

export interface SeedProject {
  name: string;
  codename?: string;
  summary: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  client?: string;
  status: Status;
  stage: Stage;
  priority: Priority;
  progress: number;
  owner?: string;
  domain?: string;
  startedDaysAgo?: number;
  activityDaysAgo: number;
  favorite?: boolean;
  pinned?: boolean;
  archived?: boolean;
  tech: string[];
  tags: string[];
  links: SeedLink[];
  steps: Array<{ title: string; dueInDays?: number; done?: boolean }>;
  notes?: Array<{ title?: string; body: string; pinned?: boolean }>;
  credentials?: Array<{ label: string; vault?: string; identifier?: string; url?: string; note?: string }>;
  assets?: Array<{ label: string; location: string; note?: string }>;
}

export const SEED_CLIENTS: Array<{
  name: string;
  company?: string;
  contact?: string;
  email?: string;
  website?: string;
  color: string;
  icon: string;
  notes?: string;
}> = [
  {
    name: "Grupo Meridiano",
    company: "Meridiano Varejo S.A.",
    contact: "Diretoria de operações",
    email: "ti@meridiano.exemplo.com",
    website: "https://meridiano.exemplo.com",
    color: "emerald",
    icon: "Store",
    notes: "Contrato anual de manutenção. Janela de deploy: terças, fora do horário comercial.",
  },
  {
    name: "Clínica Vértice",
    company: "Vértice Saúde",
    contact: "Coordenação administrativa",
    email: "contato@vertice.exemplo.com",
    color: "cyan",
    icon: "Headset",
    notes: "Dados sensíveis: LGPD em todo o fluxo de agendamento.",
  },
  {
    name: "Transportes Áureo",
    company: "Áureo Logística",
    contact: "Gerência de frota",
    color: "amber",
    icon: "Truck",
  },
];

export const SEED_TAGS: Array<{ name: string; color: string }> = [
  { name: "receita", color: "emerald" },
  { name: "infra", color: "violet" },
  { name: "mobile", color: "blue" },
  { name: "IA", color: "pink" },
  { name: "legado", color: "slate" },
  { name: "prioridade-q4", color: "rose" },
];

export const SEED_PROJECTS: SeedProject[] = [
  {
    name: "AIONIX Retail",
    codename: "atlas",
    summary: "PDV e retaguarda para redes de varejo médio porte, com estoque e fiscal integrados.",
    description:
      "Plataforma completa de frente de caixa e retaguarda. Substitui o ERP legado do cliente e centraliza estoque, fiscal e relatórios gerenciais. Operando em 14 lojas.",
    icon: "ShoppingCart",
    color: "emerald",
    category: "saas",
    client: "Grupo Meridiano",
    status: "active",
    stage: "launched",
    priority: "critical",
    progress: 85,
    owner: "Alan",
    domain: "retail.aionix.com.br",
    startedDaysAgo: 420,
    activityDaysAgo: 1,
    favorite: true,
    pinned: true,
    tech: ["Next.js", "PostgreSQL", "Prisma", "Railway", "Tailwind", "Redis"],
    tags: ["receita", "prioridade-q4"],
    links: [
      { kind: "production", url: "https://retail.aionix.com.br", primary: true, monitor: false },
      { kind: "admin", label: "Retaguarda", url: "https://admin.retail.aionix.com.br", monitor: false },
      { kind: "staging", url: "https://staging.retail.aionix.com.br", monitor: false },
      { kind: "repo", url: "https://github.com/aionix/retail", monitor: false },
      { kind: "railway", label: "Railway · produção", url: "https://railway.app/project/retail", monitor: false },
      { kind: "database", label: "Postgres primário", url: "https://railway.app/project/retail/postgres", monitor: false },
      { kind: "monitoring", label: "Sentry", url: "https://sentry.io/aionix/retail", monitor: false },
    ],
    steps: [
      { title: "Fechar conciliação fiscal do módulo de devolução", dueInDays: 3 },
      { title: "Migrar leitor de código de barras para WebHID", dueInDays: 12 },
      { title: "Publicar release 2.4 nas 14 lojas", done: true },
    ],
    notes: [
      {
        title: "Janela de deploy",
        body: "Terças, 22h–00h. Avisar a operação no grupo do WhatsApp com 1h de antecedência.",
        pinned: true,
      },
      {
        body: "O cliente pediu relatório de ruptura por seção. Estimado em 3 dias — entra depois do fiscal.",
      },
    ],
    credentials: [
      {
        label: "Painel de retaguarda (admin)",
        vault: "1Password · cofre AIONIX",
        identifier: "alan@aionix.com.br",
        url: "https://admin.retail.aionix.com.br",
        note: "Exige 2FA por app autenticador.",
      },
      { label: "Certificado A1 do cliente", vault: "Cofre físico + backup criptografado", note: "Vence em março." },
    ],
    assets: [
      { label: "Contrato de manutenção 2026", location: "https://drive.exemplo.com/meridiano/contrato" },
      { label: "Diagrama de arquitetura", location: "C:\\Projetos\\AIONIX-Retail\\docs\\arquitetura.excalidraw" },
    ],
  },
  {
    name: "Otto",
    codename: "otto",
    summary: "Assistente de IA que responde clientes no WhatsApp e agenda direto na agenda da empresa.",
    description:
      "Agente conversacional com memória por contato, integração de calendário e transferência para humano. Em beta fechado com três clínicas.",
    icon: "Bot",
    color: "violet",
    category: "produtos-proprios",
    status: "development",
    stage: "beta",
    priority: "high",
    progress: 62,
    owner: "Alan",
    domain: "otto.aionix.com.br",
    startedDaysAgo: 150,
    activityDaysAgo: 2,
    favorite: true,
    pinned: true,
    tech: ["Next.js", "Claude API", "Postgres", "Railway", "WhatsApp Cloud API"],
    tags: ["IA", "receita"],
    links: [
      { kind: "production", url: "https://otto.aionix.com.br", primary: true, monitor: false },
      { kind: "admin", label: "Console de conversas", url: "https://otto.aionix.com.br/console", monitor: false },
      { kind: "repo", url: "https://github.com/aionix/otto", monitor: false },
      { kind: "railway", url: "https://railway.app/project/otto", monitor: false },
      { kind: "docs", label: "Prompt system", url: "https://www.notion.so/otto-prompts", monitor: false },
      { kind: "service", label: "Meta for Developers", url: "https://developers.facebook.com", monitor: false },
    ],
    steps: [
      { title: "Tratar mensagens de áudio (transcrição)", dueInDays: 6 },
      { title: "Reduzir custo por conversa com cache de contexto", dueInDays: 20 },
      { title: "Onboarding da terceira clínica", done: true },
    ],
    notes: [
      {
        title: "Métrica que importa",
        body: "Taxa de agendamento sem intervenção humana. Hoje em 71%. Meta: 85% antes de abrir vendas.",
        pinned: true,
      },
    ],
    credentials: [
      { label: "Token da WhatsApp Cloud API", vault: "Railway · variáveis do serviço otto-api", note: "Rotacionar a cada 60 dias." },
    ],
  },
  {
    name: "Finara",
    codename: "finara",
    summary: "Gestão financeira para pequenas operações: fluxo de caixa, DRE simples e conciliação bancária.",
    icon: "Wallet",
    color: "blue",
    category: "saas",
    status: "development",
    stage: "build",
    priority: "high",
    progress: 40,
    owner: "Alan",
    domain: "finara.app",
    startedDaysAgo: 90,
    activityDaysAgo: 5,
    tech: ["Next.js", "Supabase", "Vercel", "Tailwind"],
    tags: ["receita"],
    links: [
      { kind: "staging", label: "Preview", url: "https://finara.vercel.app", primary: true, monitor: false },
      { kind: "repo", url: "https://github.com/aionix/finara", monitor: false },
      { kind: "vercel", url: "https://vercel.com/aionix/finara", monitor: false },
      { kind: "database", label: "Supabase", url: "https://supabase.com/dashboard/project/finara", monitor: false },
      { kind: "design", label: "Figma", url: "https://figma.com/file/finara", monitor: false },
    ],
    steps: [
      { title: "Importador de OFX dos cinco maiores bancos", dueInDays: 14 },
      { title: "Definir política de plano gratuito" },
    ],
  },
  {
    name: "AIONIX PLAY",
    summary: "Streaming de jogos local: o PC com Windows vira console na Android TV.",
    description:
      "Host em Rust/Tauri no PC, app Kotlin na TV. Vídeo HEVC via NVENC, controle virtual por ViGEmBus, pareamento TLS mútuo.",
    icon: "Gamepad2",
    color: "indigo",
    category: "produtos-proprios",
    status: "active",
    stage: "launched",
    priority: "medium",
    progress: 90,
    owner: "Alan",
    startedDaysAgo: 200,
    activityDaysAgo: 0,
    favorite: true,
    tech: ["Rust", "Tauri", "Kotlin", "Android", "NVENC"],
    tags: ["mobile"],
    links: [
      { kind: "repo", label: "Repositório local", url: "https://github.com/aionix/play", monitor: false },
      { kind: "docs", label: "Arquitetura", url: "https://github.com/aionix/play/blob/main/docs/ARCHITECTURE.md", monitor: false },
      { kind: "service", label: "GitHub (exemplo monitorado)", url: "https://github.com", monitor: true },
    ],
    steps: [{ title: "Publicar o instalador 0.1.2 com correção de áudio", dueInDays: 8 }],
    assets: [
      { label: "Instalador Windows", location: "C:\\Users\\Alan\\Documents\\Projetos\\AIONIX-PLAY\\dist" },
      { label: "Logs do host", location: "%LOCALAPPDATA%\\AIONIX\\Play\\logs" },
    ],
  },
  {
    name: "Portal Vértice",
    summary: "Agendamento online e portal do paciente para a Clínica Vértice.",
    icon: "Calendar",
    color: "cyan",
    category: "clientes",
    client: "Clínica Vértice",
    status: "active",
    stage: "maintenance",
    priority: "medium",
    progress: 100,
    owner: "Alan",
    domain: "portal.vertice.exemplo.com",
    startedDaysAgo: 300,
    activityDaysAgo: 18,
    tech: ["Next.js", "Postgres", "Railway"],
    tags: ["legado"],
    links: [
      { kind: "production", url: "https://portal.vertice.exemplo.com", primary: true, monitor: false },
      { kind: "admin", url: "https://portal.vertice.exemplo.com/admin", monitor: false },
      { kind: "repo", url: "https://github.com/aionix/vertice-portal", monitor: false },
    ],
    steps: [{ title: "Renovar certificado e revisar política LGPD", dueInDays: -4 }],
    notes: [{ body: "Contrato de suporte renova em fevereiro. Revisar escopo antes." }],
  },
  {
    name: "Rastreio Áureo",
    summary: "Painel de rastreamento de frota com histórico de rotas e alertas de desvio.",
    icon: "MapPin",
    color: "amber",
    category: "clientes",
    client: "Transportes Áureo",
    status: "paused",
    stage: "build",
    priority: "low",
    progress: 35,
    owner: "Alan",
    startedDaysAgo: 210,
    activityDaysAgo: 74,
    tech: ["Next.js", "PostGIS", "Railway"],
    tags: ["legado"],
    links: [
      { kind: "staging", url: "https://aureo-staging.exemplo.com", primary: true, monitor: false },
      { kind: "repo", url: "https://github.com/aionix/aureo", monitor: false },
    ],
    steps: [],
    notes: [
      {
        title: "Por que está pausado",
        body: "Cliente adiou a compra dos rastreadores para o próximo orçamento. Retomar quando confirmarem o hardware.",
        pinned: true,
      },
    ],
  },
  {
    name: "Forja",
    codename: "forja",
    summary: "Gerador interno de boilerplate: cria um projeto Next + banco + deploy em um comando.",
    icon: "Hammer",
    color: "orange",
    category: "ferramentas",
    status: "active",
    stage: "maintenance",
    priority: "low",
    progress: 100,
    owner: "Alan",
    startedDaysAgo: 260,
    activityDaysAgo: 31,
    tech: ["Node.js", "TypeScript"],
    tags: ["infra"],
    links: [{ kind: "repo", url: "https://github.com/aionix/forja", monitor: false, primary: true }],
    steps: [],
  },
  {
    name: "Observatório AIONIX",
    summary: "Monitoramento unificado de uptime e custo de todos os serviços em produção.",
    icon: "Radar",
    color: "rose",
    category: "sistemas-internos",
    status: "idea",
    stage: "discovery",
    priority: "medium",
    progress: 0,
    owner: "Alan",
    activityDaysAgo: 40,
    tech: [],
    tags: ["infra"],
    links: [],
    steps: [],
    notes: [
      {
        body: "Ideia: cruzar uptime (Better Stack) com custo por serviço (Railway + Vercel) numa tela só. Alerta quando custo/uso sai da curva.",
      },
    ],
  },
  {
    name: "Cartório Digital",
    summary: "Experimento de assinatura eletrônica com validade jurídica usando certificado ICP-Brasil.",
    icon: "FileText",
    color: "slate",
    category: "experimentos",
    status: "idea",
    stage: "discovery",
    priority: "low",
    progress: 0,
    activityDaysAgo: 130,
    tech: [],
    tags: [],
    links: [],
    steps: [],
  },
  {
    name: "Loja Meridiano v1",
    summary: "Primeiro e-commerce do Grupo Meridiano, substituído pelo AIONIX Retail.",
    icon: "Archive",
    color: "slate",
    category: "arquivados",
    client: "Grupo Meridiano",
    status: "completed",
    stage: "launched",
    priority: "low",
    progress: 100,
    archived: true,
    startedDaysAgo: 900,
    activityDaysAgo: 400,
    tech: ["WordPress", "WooCommerce"],
    tags: ["legado"],
    links: [{ kind: "repo", url: "https://github.com/aionix/meridiano-v1", monitor: false }],
    steps: [],
  },
];
