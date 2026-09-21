import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import { SCHEMA } from "./schema";
import { hashPassword } from "./password";
import { seedDemo } from "./seed";

/**
 * Camada de banco: Postgres.
 *  - Com DATABASE_URL (Supabase → Connection string "Transaction pooler"): usa o driver `postgres`.
 *  - Sem DATABASE_URL: usa PGlite (Postgres embutido, arquivo em ./data/pglite) — só para desenvolvimento/testes.
 * O SQL do projeto usa "?" como parâmetro; convertemos para $1, $2… aqui.
 */
type Param = null | number | string | boolean;
type Row = Record<string, unknown>;
interface Conn {
  query(text: string, params?: Param[]): Promise<Row[]>;
  exec(text: string): Promise<void>;
}
interface Driver extends Conn {
  transaction<T>(fn: (c: Conn) => Promise<T>): Promise<T>;
}

const als = new AsyncLocalStorage<Conn>();
const g = globalThis as unknown as { __saDb?: Promise<Driver> };

export function db(): Promise<Driver> {
  if (!g.__saDb) {
    g.__saDb = open().catch((e) => {
      g.__saDb = undefined; // permite nova tentativa na próxima requisição
      throw e;
    });
  }
  return g.__saDb;
}

/** timestamptz → ISO 8601 (independe do fuso da sessão). */
function toIso(v: string): string {
  const m = /^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d(?:\.\d+)?)(?:Z|([+-]\d\d)(?::?(\d\d))?)?$/.exec(v);
  if (!m) return v;
  return new Date(`${m[1]}T${m[2]}${m[3] ? `${m[3]}:${m[4] ?? "00"}` : "Z"}`).toISOString();
}

function toPg(text: string): string {
  let n = 0;
  return text
    .split("'")
    .map((part, i) => (i % 2 === 0 ? part.replace(/\?/g, () => `$${++n}`) : part))
    .join("'");
}

async function open(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  let driver: Driver;

  if (url) {
    const postgres = (await import("postgres")).default;
    const local = /@(localhost|127.0.0.1)[:/]/.test(url);
    const sql = postgres(url, {
      ssl: local || /sslmode=/.test(url) ? undefined : "require", // Supabase exige TLS
      max: Number(process.env.PG_POOL_MAX) || 3,
      prepare: false, // obrigatório com o pooler (pgbouncer/supavisor) em modo transação
      idle_timeout: 20,
      connect_timeout: 15,
      types: {
        bigint: { to: 20, from: [20], parse: (x: string) => Number(x), serialize: (x: unknown) => String(x) },
        timestamptz: { to: 1184, from: [1184], parse: toIso, serialize: (x: unknown) => String(x) },
      },
    });
    const wrap = (c: { unsafe: (t: string, p?: never[]) => PromiseLike<unknown> }): Conn => ({
      query: async (t, p) => [...((await c.unsafe(toPg(t), (p ?? []) as never[])) as Row[])],
      exec: async (t) => void (await c.unsafe(t)),
    });
    driver = {
      ...wrap(sql as never),
      transaction: (fn) => sql.begin((tx) => fn(wrap(tx as never))) as Promise<never>,
    };
  } else {
    if (process.env.VERCEL) throw new Error("DATABASE_URL não definida. Configure a variável de ambiente na Vercel (Supabase → Connect → Transaction pooler).");
    // Carregado dinamicamente e ignorado pelo bundler: só existe em desenvolvimento.
    const { PGlite } = await import(/* webpackIgnore: true */ "@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR || path.join(process.cwd(), "data", "pglite");
    const lite = new PGlite(dir, { parsers: { 20: (x: string) => Number(x), 1184: toIso } });
    await lite.waitReady;
    const wrap = (c: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>; exec: (t: string) => Promise<unknown> }): Conn => ({
      query: async (t, p) => (await c.query(toPg(t), p ?? [])).rows as Row[],
      exec: async (t) => void (await c.exec(t)),
    });
    driver = { ...wrap(lite as never), transaction: (fn) => lite.transaction((tx) => fn(wrap(tx as never))) };
  }

  await bootstrap(driver);
  return driver;
}

/** Cria as tabelas (se faltarem), o administrador inicial e as categorias/configurações padrão. Uma vez por processo. */
async function bootstrap(d: Driver) {
  await d.transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(7415)"); // evita corrida entre instâncias serverless
    const has = await c.query("SELECT to_regclass('public.admins') AS t");
    if (!has[0]?.t) await c.exec(SCHEMA);

    const admins = await c.query("SELECT COUNT(*) AS n FROM admins");
    if (Number(admins[0].n) === 0) {
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      if (email && password && password.length >= 8) {
        await c.query("INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, 'owner') ON CONFLICT DO NOTHING", [
          email,
          process.env.ADMIN_NAME || "Proprietária",
          hashPassword(password),
        ]);
        console.log(`[loja] Administrador inicial criado: ${email}`);
      } else if (process.env.NODE_ENV !== "production") {
        await c.query("INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, 'owner') ON CONFLICT DO NOTHING", [
          "admin@sabeachfit.local",
          "Administradora (dev)",
          hashPassword("admin12345"),
        ]);
        console.warn("[loja] AVISO (somente desenvolvimento): admin@sabeachfit.local / admin12345 — defina ADMIN_EMAIL e ADMIN_PASSWORD.");
      } else {
        console.error("[loja] Nenhum administrador existe. Defina ADMIN_EMAIL e ADMIN_PASSWORD (mín. 8 caracteres).");
      }
    }
    const cats = await c.query("SELECT COUNT(*) AS n FROM categories");
    if (Number(cats[0].n) === 0) await seedDemo(c, process.env.SEED_DEMO !== "false");
  });
}

async function conn(): Promise<Conn> {
  return als.getStore() ?? (await db());
}

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  return (await (await conn()).query(sql, params)) as T[];
}
export async function get<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  return (await all<T>(sql, ...params))[0];
}
/** UPDATE / DELETE / INSERT sem retorno. Devolve o nº de linhas afetadas. */
export async function run(sql: string, ...params: Param[]): Promise<{ changes: number }> {
  const c = await conn();
  const rows = await c.query(`${sql} RETURNING 1 AS _n`, params);
  return { changes: rows.length };
}
/** INSERT que devolve o id gerado. */
export async function insert(sql: string, ...params: Param[]): Promise<number> {
  const rows = await (await conn()).query(`${sql} RETURNING id`, params);
  return Number(rows[0].id);
}

/**
 * Transação. Tudo que chamar all/get/run/insert dentro de `fn` usa a mesma conexão/transação.
 * Erro → ROLLBACK automático.
 */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  const d = await db();
  if (als.getStore()) return fn(); // já dentro de uma transação
  return d.transaction((c) => als.run(c, fn));
}
