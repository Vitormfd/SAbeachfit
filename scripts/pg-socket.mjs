// Servidor Postgres de TESTE (PGlite exposto pelo protocolo do Postgres) para exercitar o driver de produção localmente.
// Uso: node scripts/pg-socket.mjs   ->  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port: 5433, host: "127.0.0.1" });
await server.start();
console.log("pg-socket ouvindo em 127.0.0.1:5433");
