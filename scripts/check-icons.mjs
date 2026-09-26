import * as L from "lucide-react";
const names = process.argv.slice(2);
const missing = names.filter((n) => !(n in L));
console.log(missing.length ? "FALTANDO: " + missing.join(", ") : "todos ok (" + names.length + ")");
