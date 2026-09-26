export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Remove acentos e caixa — base da busca difusa. */
export function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Subsequência difusa: "rtl" casa com "retail". Retorna pontuação ou -1. */
export function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = fold(haystack);
  const n = fold(needle);
  const exact = h.indexOf(n);
  if (exact === 0) return 1000 - h.length;
  if (exact > 0) return 700 - exact * 2 - h.length * 0.1;

  let score = 0;
  let hi = 0;
  let streak = 0;
  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni];
    let found = -1;
    while (hi < h.length) {
      if (h[hi] === ch) {
        found = hi;
        hi++;
        break;
      }
      hi++;
    }
    if (found === -1) return -1;
    const boundary = found === 0 || /[\s\-_/.]/.test(h[found - 1]);
    streak = ni > 0 && found === hi - 1 ? streak + 1 : 0;
    score += 10 + (boundary ? 18 : 0) + streak * 6 - found * 0.2;
  }
  return score;
}

// ---------------------------------------------------------------------------
// Datas — armazenadas em UTC ISO / "YYYY-MM-DD HH:MM:SS" pelo SQLite
// ---------------------------------------------------------------------------

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysSince(value: string | null | undefined, now = Date.now()): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return Math.floor((now - d.getTime()) / 86_400_000);
}

export function daysUntil(value: string | null | undefined, now = Date.now()): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return Math.ceil((d.getTime() - now) / 86_400_000);
}

const DTF_SHORT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const DTF_FULL = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DTF_DAY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? DTF_SHORT.format(d).replace(".", "") : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? DTF_FULL.format(d) : "—";
}

export function formatDayShort(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? DTF_DAY.format(d) : "—";
}

/** "agora", "há 3 h", "há 12 d", "em 4 d" */
export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  const d = parseDate(value);
  if (!d) return "—";
  const diff = now - d.getTime();
  const abs = Math.abs(diff);
  const past = diff >= 0;
  const min = Math.round(abs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return past ? `há ${min} min` : `em ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return past ? `há ${hours} h` : `em ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return past ? `há ${days} d` : `em ${days} d`;
  const months = Math.round(days / 30.44);
  if (months < 12) return past ? `há ${months} mês${months > 1 ? "es" : ""}` : `em ${months} mês${months > 1 ? "es" : ""}`;
  const years = (days / 365.25).toFixed(days > 550 ? 1 : 0);
  return past ? `há ${years} a` : `em ${years} a`;
}

/** Data ISO curta (YYYY-MM-DD) para inputs type=date. */
export function toDateInput(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.host}${tail}`.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ---------------------------------------------------------------------------
// Numeros e texto
// ---------------------------------------------------------------------------

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

