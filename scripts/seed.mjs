// Carrega o portfólio de demonstração direto no banco.
//   npm run db:seed          -> adiciona
//   npm run db:seed -- clear -> remove
//
// Usa DATABASE_URL. Puxe as variáveis antes com `vercel env pull`.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import { SCHEMA_SQL } from "../src/lib/schema.ts";
import { clearDemo, seedDemo } from "../src/lib/seed-run.ts";
import { toPositional } from "../src/lib/sql-placeholders.ts";

const envFile = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("DATABASE_URL ausente. Rode `vercel env pull` antes de semear.");
  process.exit(1);
}

pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

const conn = new pg.Client({ connectionString });
await conn.connect();
await conn.query(SCHEMA_SQL);

const db = {
  get: async (sql, params = []) => (await conn.query(toPositional(sql), params)).rows[0],
  run: (sql, params = []) => conn.query(toPositional(sql), params),
  uid: randomUUID,
};

// Categorias e ferramentas padrão, caso o app ainda não tenha subido.
const categories = await conn.query("SELECT COUNT(*) AS n FROM categories");
if (categories.rows[0].n === 0) {
  console.error("Suba o app uma vez (npm run dev) para criar as categorias padrão antes de semear.");
  await conn.end();
  process.exit(1);
}

if (process.argv.includes("clear")) {
  const removed = await clearDemo(db);
  console.log(`removidos: ${removed} projeto(s) de demonstração`);
} else {
  const { created, skipped } = await seedDemo(db);
  console.log(`criados: ${created} · já existiam: ${skipped}`);
}

await conn.end();
