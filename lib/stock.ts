import "server-only";
import { all, get, run, tx } from "./db";

export class StockError extends Error {
  constructor(message: string, public variantId?: number) {
    super(message);
  }
}

export type MovementType = "entrada" | "saida" | "ajuste" | "reserva_pedido" | "devolucao_pedido" | "inicial";

/**
 * ÚNICO ponto que altera estoque. Deve rodar dentro de tx().
 * O UPDATE condicional (stock + delta >= 0) é atômico no Postgres: se dois pedidos disputam a última
 * unidade, o segundo espera o lock da linha, reavalia a condição e falha -> StockError e ROLLBACK.
 */
export async function moveStock(o: { variantId: number; delta: number; type: MovementType; reason?: string; adminId?: number | null; orderId?: number | null }) {
  const rows = await all<{ stock: number }>("UPDATE variants SET stock = stock + ? WHERE id = ? AND stock + ? >= 0 RETURNING stock", o.delta, o.variantId, o.delta);
  if (rows.length === 0) {
    const exists = await get<{ id: number }>("SELECT id FROM variants WHERE id = ?", o.variantId);
    throw new StockError(exists ? "Estoque insuficiente para esta variação." : "Variação não encontrada.", o.variantId);
  }
  const after = rows[0].stock;
  await run(
    "INSERT INTO stock_movements (variant_id, type, delta, stock_after, reason, admin_id, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    o.variantId,
    o.type,
    o.delta,
    after,
    o.reason ?? "",
    o.adminId ?? null,
    o.orderId ?? null,
  );
  return after;
}

/** Movimentação manual feita por um administrador. `ajuste` define o valor absoluto contado. */
export async function manualMovement(o: { variantId: number; kind: "entrada" | "saida" | "ajuste"; qty: number; reason: string; adminId: number }) {
  return tx(async () => {
    const cur = await get<{ stock: number }>("SELECT stock FROM variants WHERE id = ? FOR UPDATE", o.variantId);
    if (!cur) throw new StockError("Variação não encontrada.");
    const delta = o.kind === "entrada" ? o.qty : o.kind === "saida" ? -o.qty : o.qty - cur.stock;
    if (delta === 0) return cur.stock;
    return moveStock({ variantId: o.variantId, delta, type: o.kind, reason: o.reason, adminId: o.adminId });
  });
}

export type StockRow = {
  variant_id: number; product_id: number; product_name: string; color: string; size: string; stock: number; threshold: number; archived: number; active: number;
};

export async function stockRows(filter: "all" | "low" | "out" = "all", search = "") {
  const where = ["v.active = 1", "p.archived = 0"];
  const params: (string | number)[] = [];
  if (filter === "low") where.push("v.stock > 0 AND v.stock <= p.low_stock_threshold");
  if (filter === "out") where.push("v.stock = 0");
  if (search) where.push("p.name ILIKE ?"), params.push(`%${search}%`);
  return all<StockRow>(
    `SELECT v.id AS variant_id, p.id AS product_id, p.name AS product_name, v.color, v.size, v.stock,
            p.low_stock_threshold AS threshold, p.archived, p.active
     FROM variants v JOIN products p ON p.id = v.product_id
     WHERE ${where.join(" AND ")} ORDER BY p.name, v.position, v.id`,
    ...params,
  );
}

export async function movementHistory(opts: { variantId?: number; productId?: number; limit?: number } = {}) {
  const where = opts.variantId ? "WHERE m.variant_id = ?" : opts.productId ? "WHERE v.product_id = ?" : "";
  const params = opts.variantId ? [opts.variantId] : opts.productId ? [opts.productId] : [];
  return all<{
    id: number; created_at: string; type: string; delta: number; stock_after: number; reason: string; order_id: number | null;
    product_name: string; color: string; size: string; admin_name: string | null;
  }>(
    `SELECT m.id, m.created_at, m.type, m.delta, m.stock_after, m.reason, m.order_id, p.name AS product_name, v.color, v.size, a.name AS admin_name
     FROM stock_movements m JOIN variants v ON v.id = m.variant_id JOIN products p ON p.id = v.product_id
     LEFT JOIN admins a ON a.id = m.admin_id ${where} ORDER BY m.id DESC LIMIT ?`,
    ...params,
    opts.limit ?? 100,
  );
}

export const MOVEMENT_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída manual",
  ajuste: "Ajuste de inventário",
  reserva_pedido: "Reserva (pedido)",
  devolucao_pedido: "Devolução (pedido cancelado)",
  inicial: "Estoque inicial",
};
