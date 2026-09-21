// Gera lib/schema.ts a partir de supabase/schema.sql (fonte única). Uso: npm run db:schema
import fs from "node:fs";
const sql = fs.readFileSync("supabase/schema.sql", "utf8");
fs.writeFileSync("lib/schema.ts", `// GERADO por scripts/sync-schema.mjs a partir de supabase/schema.sql — não edite à mão.\nexport const SCHEMA = ${JSON.stringify(sql)};\n`);
console.log("lib/schema.ts atualizado");
