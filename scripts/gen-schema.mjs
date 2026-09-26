import fs from "node:fs";
const sql = fs.readFileSync("src/lib/schema.sql", "utf8");
if (sql.includes("`") || sql.includes("${")) throw new Error("schema.sql contem caracteres que quebram o template literal");
const out = [
  "// GERADO AUTOMATICAMENTE a partir de src/lib/schema.sql — nao edite a mao.",
  "// Regenerar: node scripts/gen-schema.mjs",
  "export const SCHEMA_SQL = String.raw`",
  sql,
  "`;",
  "",
].join("\n");
fs.writeFileSync("src/lib/schema.ts", out);
console.log("src/lib/schema.ts", fs.statSync("src/lib/schema.ts").size, "bytes");
