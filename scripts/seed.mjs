// Carrega o portfólio de demonstração direto no banco.
//   npm run db:seed          -> adiciona
//   npm run db:seed -- clear -> remove
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA_SQL } from "../src/lib/schema.ts";
import { clearDemo, seedDemo } from "../src/lib/seed-run.ts";

const envFile = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const file = path.resolve(process.cwd(), process.env.NEXUS_DB_PATH || "./data/nexus.db");
fs.mkdirSync(path.dirname(file), { recursive: true });

const conn = new DatabaseSync(file);
conn.exec("PRAGMA journal_mode = WAL");
conn.exec("PRAGMA foreign_keys = ON");
conn.exec(SCHEMA_SQL);

const db = {
  get: (sql, params = []) => conn.prepare(sql).get(...params),
  run: (sql, params = []) => conn.prepare(sql).run(...params),
  uid: randomUUID,
};

// Categorias e ferramentas padrão, caso o app ainda não tenha subido.
if ((conn.prepare("SELECT COUNT(*) AS n FROM categories").get()).n === 0) {
  console.error("Suba o app uma vez (npm run dev) para criar as categorias padrão antes de semear.");
  process.exit(1);
}

if (process.argv.includes("clear")) {
  const removed = clearDemo(db);
  console.log(`removidos: ${removed} projeto(s) de demonstração`);
} else {
  const { created, skipped } = seedDemo(db);
  console.log(`criados: ${created} · já existiam: ${skipped}`);
}
conn.close();
