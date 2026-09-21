import "server-only";
import { all, get } from "./db";

export async function dashboardStats(days: number) {
  const since = "created_at >= now() - (?::int * interval '1 day')";
  const counts = (await get<{ total: number; awaiting: number; confirmed: number; canceled: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM((status = 'awaiting')::int), 0) AS awaiting,
            COALESCE(SUM((status IN ('confirmed','preparing','ready','completed'))::int), 0) AS confirmed,
            COALESCE(SUM((status = 'canceled')::int), 0) AS canceled
     FROM orders WHERE ${since}`,
    days,
  ))!;
  // Faturamento registrado = pedidos marcados como PAGOS pelo administrador e não cancelados.
  const revenue = (await get<{ cents: number; n: number }>(
    `SELECT COALESCE(SUM(total_cents), 0) AS cents, COUNT(*) AS n FROM orders
     WHERE payment_status = 'paid' AND status <> 'canceled' AND ${since}`,
    days,
  ))!;
  const pendingValue = (await get<{ cents: number }>(
    `SELECT COALESCE(SUM(total_cents), 0) AS cents FROM orders WHERE status IN ('awaiting','confirmed','preparing','ready') AND payment_status <> 'paid'`,
  ))!.cents;
  const series = await all<{ day: string; cents: number; orders: number }>(
    `SELECT (created_at AT TIME ZONE 'America/Bahia')::date::text AS day,
            COALESCE(SUM(CASE WHEN payment_status = 'paid' AND status <> 'canceled' THEN total_cents END), 0) AS cents, COUNT(*) AS orders
     FROM orders WHERE ${since} AND status <> 'canceled' GROUP BY 1 ORDER BY 1`,
    days,
  );
  const low = await all<{ variant_id: number; product_id: number; name: string; color: string; size: string; stock: number }>(
    `SELECT v.id AS variant_id, p.id AS product_id, p.name, v.color, v.size, v.stock FROM variants v JOIN products p ON p.id = v.product_id
     WHERE v.active = 1 AND p.archived = 0 AND p.active = 1 AND v.stock > 0 AND v.stock <= p.low_stock_threshold ORDER BY v.stock, p.name LIMIT 30`,
  );
  const out = await all<{ variant_id: number; product_id: number; name: string; color: string; size: string }>(
    `SELECT v.id AS variant_id, p.id AS product_id, p.name, v.color, v.size FROM variants v JOIN products p ON p.id = v.product_id
     WHERE v.active = 1 AND p.archived = 0 AND p.active = 1 AND v.stock = 0 ORDER BY p.name LIMIT 30`,
  );
  const outProducts = (await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM products p WHERE p.archived = 0 AND p.active = 1
     AND NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.active = 1 AND v.stock > 0)`,
  ))!.n;
  const lowProducts = new Set(low.map((l) => l.product_id)).size;
  const recent = await all<{ id: number; customer_name: string; total_cents: number; status: string; created_at: string }>(
    "SELECT id, customer_name, total_cents, status, created_at FROM orders ORDER BY id DESC LIMIT 6",
  );
  return { counts, revenue, pendingValue, series, low, out, outProducts, lowProducts, recent };
}
