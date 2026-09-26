import { PRIORITY_META, STATUSES, type Priority, type Status } from "./domain";
import type { AttentionFlag, AttentionItem, Project } from "./types";
import { daysSince, daysUntil } from "./utils";

/** Quantos dias sem atividade até um projeto ser considerado esquecido. */
export const STALE_DAYS: Record<Status, number> = {
  active: 21,
  development: 14,
  paused: 60,
  completed: 365,
  idea: 120,
};

export function attentionFlags(p: Project, now = Date.now()): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  const idle = daysSince(p.last_activity_at, now) ?? 0;

  if (p.nextStep?.due_at) {
    const left = daysUntil(p.nextStep.due_at, now) ?? 0;
    if (left < 0) {
      flags.push({
        reason: "overdue",
        label: "Próximo passo atrasado",
        detail: `"${p.nextStep.title}" venceu há ${Math.abs(left)} d`,
        severity: 3,
      });
    }
  }

  if (p.brokenLinks > 0) {
    flags.push({
      reason: "broken-link",
      label: p.brokenLinks === 1 ? "1 link fora do ar" : `${p.brokenLinks} links fora do ar`,
      detail: "A última verificação retornou erro",
      severity: 3,
    });
  }

  if (p.openSteps === 0 && p.status !== "completed") {
    flags.push({
      reason: "no-next-step",
      label: "Sem próximo passo",
      detail: "Nenhuma ação definida — decida o que vem agora",
      severity: 2,
    });
  }

  const limit = STALE_DAYS[p.status];
  if (idle > limit && p.status !== "completed") {
    flags.push({
      reason: "stale",
      label: "Parado há tempo demais",
      detail: `${idle} dias sem movimento (limite ${limit} d para ${p.status === "active" ? "ativos" : "este status"})`,
      severity: idle > limit * 2 ? 3 : 2,
    });
  }

  if (p.status === "active" && !p.primaryUrl) {
    flags.push({
      reason: "no-production-url",
      label: "Ativo sem URL de produção",
      detail: "Um projeto no ar deveria ter endereço cadastrado",
      severity: 2,
    });
  }

  if (p.status === "development" && p.progress === 0 && idle > 7) {
    flags.push({
      reason: "stalled-progress",
      label: "Progresso em 0%",
      detail: "Em desenvolvimento, mas nada registrado ainda",
      severity: 1,
    });
  }

  return flags;
}

export function attentionList(projects: Project[], now = Date.now()): AttentionItem[] {
  return projects
    .filter((p) => !p.is_archived)
    .map((project) => {
      const flags = attentionFlags(project, now);
      const priorityBoost = PRIORITY_META[project.priority].weight;
      const statusBoost = project.status === "active" ? 3 : project.status === "development" ? 2 : 0;
      const score = flags.reduce((sum, f) => sum + f.severity * 10, 0) + priorityBoost * 2 + statusBoost;
      return { project, flags, score };
    })
    .filter((item) => item.flags.length > 0)
    .sort((a, b) => b.score - a.score);
}

export interface PortfolioStats {
  total: number;
  byStatus: Record<Status, number>;
  byPriority: Record<Priority, number>;
  archived: number;
  favorites: number;
  pinned: number;
  totalLinks: number;
  brokenLinks: number;
  openSteps: number;
  overdueSteps: number;
  avgProgressActive: number;
  updatedThisWeek: number;
  untouched30d: number;
  clients: number;
  categories: number;
  momentum: number;
}

export function portfolioStats(
  projects: Project[],
  extras: { clients: number; categories: number; archived: number },
  now = Date.now(),
): PortfolioStats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  let totalLinks = 0;
  let brokenLinks = 0;
  let openSteps = 0;
  let overdueSteps = 0;
  let favorites = 0;
  let pinned = 0;
  let updatedThisWeek = 0;
  let untouched30d = 0;
  let progressSum = 0;
  let progressCount = 0;

  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    byPriority[p.priority] += 1;
    totalLinks += p.linkCount;
    brokenLinks += p.brokenLinks;
    openSteps += p.openSteps;
    if (p.nextStep?.due_at && (daysUntil(p.nextStep.due_at, now) ?? 0) < 0) overdueSteps += 1;
    if (p.is_favorite) favorites += 1;
    if (p.is_pinned) pinned += 1;
    const idle = daysSince(p.last_activity_at, now) ?? 999;
    if (idle <= 7) updatedThisWeek += 1;
    if (idle > 30) untouched30d += 1;
    if (p.status === "active" || p.status === "development") {
      progressSum += p.progress;
      progressCount += 1;
    }
  }

  return {
    total: projects.length,
    byStatus,
    byPriority,
    archived: extras.archived,
    favorites,
    pinned,
    totalLinks,
    brokenLinks,
    openSteps,
    overdueSteps,
    avgProgressActive: progressCount ? Math.round(progressSum / progressCount) : 0,
    updatedThisWeek,
    untouched30d,
    clients: extras.clients,
    categories: extras.categories,
    momentum: projects.length ? Math.round((updatedThisWeek / projects.length) * 100) : 0,
  };
}

/** Itens da visão "Hoje": vencidos primeiro, depois a semana. */
export interface AgendaItem {
  project: Project;
  stepId: string;
  title: string;
  due: string | null;
  daysLeft: number | null;
  bucket: "overdue" | "today" | "week" | "later" | "undated";
}

export function agenda(projects: Project[], now = Date.now()): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const p of projects) {
    if (p.is_archived || !p.nextStep) continue;
    const left = p.nextStep.due_at ? daysUntil(p.nextStep.due_at, now) : null;
    const bucket: AgendaItem["bucket"] =
      left === null ? "undated" : left < 0 ? "overdue" : left === 0 ? "today" : left <= 7 ? "week" : "later";
    items.push({
      project: p,
      stepId: p.nextStep.id,
      title: p.nextStep.title,
      due: p.nextStep.due_at,
      daysLeft: left,
      bucket,
    });
  }
  const order = { overdue: 0, today: 1, week: 2, later: 3, undated: 4 };
  return items.sort((a, b) => {
    if (order[a.bucket] !== order[b.bucket]) return order[a.bucket] - order[b.bucket];
    if (a.daysLeft !== null && b.daysLeft !== null) return a.daysLeft - b.daysLeft;
    return PRIORITY_META[b.project.priority].weight - PRIORITY_META[a.project.priority].weight;
  });
}

/** Ordem de foco: o que merece atenção hoje, do topo para baixo. */
export function focusOrder(projects: Project[], now = Date.now()): Project[] {
  const attention = new Map(attentionList(projects, now).map((a) => [a.project.id, a.score]));
  return [...projects]
    .filter((p) => !p.is_archived && p.status !== "completed" && p.status !== "idea")
    .sort((a, b) => {
      const scoreA = (attention.get(a.id) ?? 0) + PRIORITY_META[a.priority].weight * 6 + (a.is_pinned ? 25 : 0);
      const scoreB = (attention.get(b.id) ?? 0) + PRIORITY_META[b.priority].weight * 6 + (b.is_pinned ? 25 : 0);
      return scoreB - scoreA;
    });
}

/** Saúde 0–100 de um projeto, usada nos medidores. */
export function healthScore(p: Project, now = Date.now()): number {
  if (p.status === "completed") return 100;
  let score = 100;
  for (const flag of attentionFlags(p, now)) score -= flag.severity * 12;
  const idle = daysSince(p.last_activity_at, now) ?? 0;
  score -= Math.min(20, Math.floor(idle / 7) * 3);
  return Math.max(0, Math.min(100, score));
}

export function healthLabel(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 75) return { label: "Saudável", tone: "good" };
  if (score >= 45) return { label: "Atenção", tone: "warn" };
  return { label: "Crítico", tone: "bad" };
}
