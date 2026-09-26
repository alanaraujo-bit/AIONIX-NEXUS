import "server-only";

import { DatabaseSync, type StatementSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA_SQL } from "./schema";

type Row = Record<string, unknown>;

declare global {
  // eslint-disable-next-line no-var
  var __nexusDb: DatabaseSync | undefined;
}

function resolveDbPath(): string {
  const configured = process.env.NEXUS_DB_PATH?.trim();
  const file = configured && configured.length > 0 ? configured : "./data/nexus.db";
  // O caminho vem de variável de ambiente por design (volume em produção);
  // o comentário evita que o bundler trace o projeto inteiro por causa disso.
  const abs = path.isAbsolute(file) ? file : path.join(/* turbopackIgnore: true */ process.cwd(), file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}

function open(): DatabaseSync {
  const db = new DatabaseSync(resolveDbPath());
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(SCHEMA_SQL);
  bootstrap(db);
  return db;
}

/** Conexao unica por processo (sobrevive ao hot-reload do Next em dev). */
export function db(): DatabaseSync {
  if (!globalThis.__nexusDb) globalThis.__nexusDb = open();
  return globalThis.__nexusDb;
}

export const uid = (): string => randomUUID();

export function all<T = Row>(sql: string, params: unknown[] = []): T[] {
  return prepare(sql).all(...(params as never[])) as T[];
}

export function get<T = Row>(sql: string, params: unknown[] = []): T | undefined {
  return prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, params: unknown[] = []) {
  return prepare(sql).run(...(params as never[]));
}

const stmtCache = new Map<string, StatementSync>();
function prepare(sql: string): StatementSync {
  const cached = stmtCache.get(sql);
  if (cached) return cached;
  const stmt = db().prepare(sql);
  stmtCache.set(sql, stmt);
  return stmt;
}

/** Executa varias escritas numa transacao. */
export function tx<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const out = fn();
    conn.exec("COMMIT");
    return out;
  } catch (err) {
    try {
      conn.exec("ROLLBACK");
    } catch {
      /* já revertido */
    }
    throw err;
  }
}

export const bool = (v: unknown): boolean => v === 1 || v === true || v === "1";
export const int = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : Number(v ?? fallback) || fallback);

// ---------------------------------------------------------------------------
// Bootstrap: categorias, grupos de atalho e usuario inicial
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Array<[string, string, string, string, string]> = [
  ["Produtos próprios", "produtos-proprios", "Rocket", "indigo", "Produtos autorais da AIONIX"],
  ["SaaS", "saas", "Cloud", "blue", "Software como serviço, recorrência"],
  ["Sistemas internos", "sistemas-internos", "Server", "cyan", "Ferramentas que sustentam a operação"],
  ["Clientes", "clientes", "Handshake", "emerald", "Entregas contratadas"],
  ["Experimentos", "experimentos", "FlaskConical", "amber", "Provas de conceito e testes"],
  ["Ferramentas", "ferramentas", "Wrench", "violet", "Utilitários e automações"],
  ["Ideias", "ideias", "Sparkles", "pink", "Ainda não começou"],
  ["Arquivados", "arquivados", "Archive", "slate", "Encerrados, mantidos por histórico"],
];

const DEFAULT_TOOL_GROUPS: Array<[string, string, string]> = [
  ["Infraestrutura", "infraestrutura", "Server"],
  ["Código", "codigo", "GitBranch"],
  ["IA", "ia", "BrainCircuit"],
  ["Domínios & DNS", "dominios-dns", "Globe"],
];

const DEFAULT_TOOLS: Array<[string, string, string, string, string, string]> = [
  ["GitHub", "https://github.com", "Repositórios", "GitBranch", "slate", "codigo"],
  ["Vercel", "https://vercel.com/dashboard", "Deploys frontend", "Triangle", "slate", "infraestrutura"],
  ["Railway", "https://railway.app/dashboard", "Serviços e bancos", "Train", "violet", "infraestrutura"],
  ["Cloudflare", "https://dash.cloudflare.com", "DNS, proxy e WAF", "Cloud", "orange", "dominios-dns"],
  ["Registro.br", "https://registro.br", "Domínios .br", "Globe", "emerald", "dominios-dns"],
  ["Supabase", "https://supabase.com/dashboard", "Postgres gerenciado", "Database", "emerald", "infraestrutura"],
  ["Claude", "https://claude.ai", "Assistente principal", "Sparkles", "amber", "ia"],
  ["OpenAI", "https://platform.openai.com", "API e playground", "BrainCircuit", "cyan", "ia"],
  ["Figma", "https://figma.com", "Design", "Palette", "pink", "codigo"],
  ["Sentry", "https://sentry.io", "Erros em produção", "Activity", "rose", "infraestrutura"],
];

function bootstrap(conn: DatabaseSync) {
  const hasCategory = conn.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };
  if (hasCategory.n === 0) {
    const insert = conn.prepare(
      "INSERT INTO categories (id, name, slug, icon, color, descricao, sort) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    DEFAULT_CATEGORIES.forEach(([name, slug, icon, color, descricao], i) => {
      insert.run(randomUUID(), name, slug, icon, color, descricao, i);
    });
  }

  const hasGroups = conn.prepare("SELECT COUNT(*) AS n FROM tool_groups").get() as { n: number };
  if (hasGroups.n === 0) {
    const insertGroup = conn.prepare("INSERT INTO tool_groups (id, name, icon, sort) VALUES (?, ?, ?, ?)");
    const groupIds = new Map<string, string>();
    DEFAULT_TOOL_GROUPS.forEach(([name, slug, icon], i) => {
      const id = randomUUID();
      groupIds.set(slug, id);
      insertGroup.run(id, name, icon, i);
    });
    const insertTool = conn.prepare(
      "INSERT INTO tools (id, group_id, name, url, subtitle, icon, color, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    DEFAULT_TOOLS.forEach(([name, url, subtitle, icon, color, group], i) => {
      insertTool.run(randomUUID(), groupIds.get(group) ?? null, name, url, subtitle, icon, color, i);
    });
  }

  const ownerName = process.env.NEXUS_OWNER_NAME?.trim();
  if (ownerName) {
    conn
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('owner_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(ownerName);
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function setting(key: string, fallback: string): string {
  const row = get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  run("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')", [key, value]);
}

export function allSettings(): Record<string, string> {
  const rows = all<{ key: string; value: string }>("SELECT key, value FROM settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
