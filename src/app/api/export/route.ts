import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Tabelas exportadas. `users`, `sessions` e `login_attempts` ficam de fora de propósito. */
const TABLES = [
  "settings",
  "categories",
  "clients",
  "tags",
  "projects",
  "project_tags",
  "project_tech",
  "project_links",
  "project_steps",
  "project_credentials",
  "project_assets",
  "notes",
  "tool_groups",
  "tools",
  "activity",
] as const;

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const payload: Record<string, unknown> = {
    _meta: {
      app: "AIONIX NEXUS",
      version: 1,
      exportedAt: new Date().toISOString(),
      note: "Credenciais reais nunca são armazenadas — apenas referências de onde encontrá-las.",
    },
  };
  for (const table of TABLES) payload[table] = await all(`SELECT * FROM ${table}`);

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="nexus-backup-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
