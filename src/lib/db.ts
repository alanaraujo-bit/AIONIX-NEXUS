import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

import { SCHEMA_SQL } from "./schema";
import { toPositional } from "./sql-placeholders";

type Row = Record<string, unknown>;

// COUNT(*) e demais int8 chegam como string no driver; o codigo compara com
// number (`n === 0`), entao normaliza na entrada.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

declare global {
  // eslint-disable-next-line no-var
  var __nexusPool: pg.Pool | undefined;
  // eslint-disable-next-line no-var
  var __nexusReady: Promise<void> | undefined;
}

/** Conexao da transacao em curso, quando ha uma. Ver tx(). */
const txStore = new AsyncLocalStorage<pg.PoolClient>();

function connectionString(): string {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL ausente. O NEXUS precisa de um Postgres — rode `vercel env pull` " +
        "ou defina a variavel no ambiente antes de subir.",
    );
  }
  return url;
}

function createPool(): pg.Pool {
  const pool = new pg.Pool({
    connectionString: connectionString(),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // Na Vercel (Fluid compute) isso drena o pool no shutdown da instancia.
  // Fora dela e inofensivo.
  try {
    attachDatabasePool(pool);
  } catch {
    /* runtime sem suporte — segue com o pool normal */
  }
  return pool;
}

/** Pool unico por processo (sobrevive ao hot-reload do Next em dev). */
function pool(): pg.Pool {
  if (!globalThis.__nexusPool) globalThis.__nexusPool = createPool();
  return globalThis.__nexusPool;
}

// ---------------------------------------------------------------------------
// Inicializacao do schema
// ---------------------------------------------------------------------------

// Chave arbitraria e estavel para o advisory lock: impede que dois cold starts
// simultaneos rodem o CREATE TABLE ao mesmo tempo.
const SCHEMA_LOCK = 4_120_250_926;

async function initialize(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [SCHEMA_LOCK]);
    await client.query(SCHEMA_SQL);
    await bootstrap(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [SCHEMA_LOCK]).catch(() => {});
    client.release();
  }
}

/**
 * Garante schema criado e dados iniciais semeados. Roda uma vez por processo;
 * se falhar, limpa o cache para o proximo request tentar de novo em vez de
 * servir um erro fantasma para sempre.
 */
export function ready(): Promise<void> {
  if (!globalThis.__nexusReady) {
    globalThis.__nexusReady = initialize().catch((err) => {
      globalThis.__nexusReady = undefined;
      throw err;
    });
  }
  return globalThis.__nexusReady;
}

// ---------------------------------------------------------------------------
// API de consulta
// ---------------------------------------------------------------------------

export const uid = (): string => randomUUID();

/**
 * Um `await` esquecido faz uma Promise virar parametro de query. O driver a
 * serializa sem reclamar e grava lixo no banco — e o TypeScript nao pega,
 * porque params e `unknown[]`. Falhar alto aqui custa nada e ja evitou slugs
 * corrompidos na migracao do SQLite.
 */
function rejectPromises(sql: string, params: unknown[]): void {
  const i = params.findIndex((p) => p instanceof Promise);
  if (i >= 0) {
    throw new Error(
      `Parametro ${i + 1} e uma Promise — falta um await na chamada. SQL: ${sql.trim().slice(0, 120)}`,
    );
  }
}

async function query<T extends Row>(sql: string, params: unknown[]): Promise<pg.QueryResult<T>> {
  rejectPromises(sql, params);
  await ready();
  const text = toPositional(sql);
  const client = txStore.getStore();
  const target = client ?? pool();
  return target.query<T>(text, params as never[]);
}

export async function all<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await query<T & Row>(sql, params);
  return res.rows as T[];
}

export async function get<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const res = await query<T & Row>(sql, params);
  return res.rows[0] as T | undefined;
}

export async function run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  const res = await query(sql, params);
  return { changes: res.rowCount ?? 0 };
}

/**
 * Executa varias escritas numa transacao. As chamadas aninhadas de all/get/run
 * enxergam a conexao da transacao via AsyncLocalStorage — sem isso cada uma
 * pegaria uma conexao diferente do pool e o BEGIN nao cobriria nada.
 * Chamadas reentrantes reaproveitam a transacao externa.
 */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  await ready();
  if (txStore.getStore()) return fn();

  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await txStore.run(client, fn);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {
      /* conexao ja perdida — o release descarta */
    });
    throw err;
  } finally {
    client.release();
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

async function bootstrap(conn: pg.PoolClient) {
  const categories = await conn.query<{ n: number }>("SELECT COUNT(*) AS n FROM categories");
  if (categories.rows[0].n === 0) {
    for (const [i, [name, slug, icon, color, descricao]] of DEFAULT_CATEGORIES.entries()) {
      await conn.query(
        "INSERT INTO categories (id, name, slug, icon, color, descricao, sort) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [randomUUID(), name, slug, icon, color, descricao, i],
      );
    }
  }

  const groups = await conn.query<{ n: number }>("SELECT COUNT(*) AS n FROM tool_groups");
  if (groups.rows[0].n === 0) {
    const groupIds = new Map<string, string>();
    for (const [i, [name, slug, icon]] of DEFAULT_TOOL_GROUPS.entries()) {
      const id = randomUUID();
      groupIds.set(slug, id);
      await conn.query("INSERT INTO tool_groups (id, name, icon, sort) VALUES ($1, $2, $3, $4)", [id, name, icon, i]);
    }
    for (const [i, [name, url, subtitle, icon, color, group]] of DEFAULT_TOOLS.entries()) {
      await conn.query(
        "INSERT INTO tools (id, group_id, name, url, subtitle, icon, color, sort) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [randomUUID(), groupIds.get(group) ?? null, name, url, subtitle, icon, color, i],
      );
    }
  }

  const ownerName = process.env.NEXUS_OWNER_NAME?.trim();
  if (ownerName) {
    await conn.query(
      "INSERT INTO settings (key, value) VALUES ('owner_name', $1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [ownerName],
    );
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function setting(key: string, fallback: string): Promise<string> {
  const row = await get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await run(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    [key, value],
  );
}

export async function allSettings(): Promise<Record<string, string>> {
  const rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
