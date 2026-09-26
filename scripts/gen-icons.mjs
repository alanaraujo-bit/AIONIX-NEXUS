import fs from "node:fs";
import * as L from "lucide-react";

const src = fs.readFileSync("src/lib/domain.ts", "utf8");
const block = src.split("export const ICON_CHOICES = [")[1].split("] as const;")[0];
const choices = [...block.matchAll(/"([A-Za-z0-9]+)"/g)].map((m) => m[1]);

// Ícones usados por tipos de link, categorias padrão e grupos de atalho.
const extras = [
  "Globe", "FlaskConical", "ShieldCheck", "GitBranch", "BookText", "Palette", "Train", "Triangle",
  "Database", "HardDrive", "Activity", "ChartLine", "Plug", "Link2", "Layers", "Cloud", "Server",
  "Handshake", "Wrench", "Sparkles", "Archive", "Rocket", "Building2", "Box", "Grid2x2",
  "BrainCircuit", "ExternalLink", "CircleDashed",
];

const names = [...new Set([...choices, ...extras])].sort();
const missing = names.filter((n) => !(n in L));
if (missing.length) throw new Error("Ícones inexistentes no lucide: " + missing.join(", "));

const out = `// GERADO AUTOMATICAMENTE — node scripts/gen-icons.mjs
// Mapa explícito (em vez de import * as) para manter o bundle enxuto.
import {
${names.map((n) => `  ${n},`).join("\n")}
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
${names.map((n) => `  ${n},`).join("\n")}
};

export const FALLBACK_ICON = CircleDashed;
`;
fs.writeFileSync("src/components/icon-map.ts", out);
console.log("src/components/icon-map.ts —", names.length, "ícones");
