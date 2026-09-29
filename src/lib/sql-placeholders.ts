/**
 * Converte os `?` do dialeto SQLite para os `$1..$n` do Postgres, preservando
 * o SQL escrito no resto do codigo. Ignora `?` dentro de literais entre aspas
 * simples e de identificadores entre aspas duplas.
 *
 * Vive fora de db.ts porque o script `npm run db:seed` tambem precisa dele, e
 * db.ts importa "server-only" — que nao carrega num processo Node comum.
 */
export function toPositional(sql: string): string {
  let out = "";
  let i = 0;
  let quote: "'" | '"' | null = null;

  for (let p = 0; p < sql.length; p++) {
    const ch = sql[p];

    if (quote) {
      out += ch;
      // Aspas duplicadas ('' ou "") sao escape, nao fechamento.
      if (ch === quote) {
        if (sql[p + 1] === quote) {
          out += sql[p + 1];
          p++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }

    out += ch === "?" ? `$${++i}` : ch;
  }

  return out;
}
