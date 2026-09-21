import "server-only";
import { all, get, insert, run, tx } from "./db";
import { moveStock, StockError } from "./stock";
import { getSettings, shippingConfig } from "./settings";
import { quoteDelivery } from "./shipping";
import { newToken } from "./password";
import { buildMessage, whatsappUrl, type MessageItem, type MessageOrder } from "./whatsapp";
import { effectivePrice, statusLabel, ORDER_STATUSES } from "./util";
import { activeProvider } from "./payments";

export class OrderError extends Error {
  constructor(message: string, public code: "stock" | "invalid" | "disabled", public lines?: { variantId: number; available: number }[]) {
    super(message);
  }
}

export type NewOrderInput = {
  idempotencyKey: string;
  name: string;
  phone: string;
  method: "pickup" | "delivery";
  address: string;
  city: string;
  notes: string;
  items: { variantId: number; qty: number }[];
};

type VariantRow = {
  id: number; product_id: number; color: string; size: string; stock: number; v_active: number;
  name: string; price_cents: number; promo_price_cents: number | null; p_active: number; archived: number; image: string | null;
};

/**
 * Cria o pedido e RESERVA o estoque na mesma transação:
 *  - preço sempre vem do banco (nunca do cliente);
 *  - cada variação é decrementada com UPDATE condicional (lock de linha no Postgres) -> impossível vender acima do estoque;
 *  - idempotencyKey único evita pedido duplicado em cliques repetidos / reenvio.
 * Se o pedido for cancelado, o estoque volta (updateOrderStatus).
 */
export async function createOrder(input: NewOrderInput) {
  const settings = await getSettings();
  const cfg = shippingConfig(settings);
  if (input.method === "delivery" && !cfg.deliveryEnabled) throw new OrderError("A entrega não está disponível no momento.", "disabled");
  if (input.method === "pickup" && !cfg.pickupEnabled) throw new OrderError("A retirada não está disponível no momento.", "disabled");

  const existing = await get<{ id: number; public_token: string }>("SELECT id, public_token FROM orders WHERE idempotency_key = ?", input.idempotencyKey);
  if (existing) return { id: existing.id, token: existing.public_token, duplicate: true, ...(await buildOrderMessage(existing.id)) };

  let result: { id: number; token: string; duplicate: boolean };
  try {
    result = await tx(async () => {
      // Une itens repetidos da mesma variação.
      const merged = new Map<number, number>();
      for (const it of input.items) merged.set(it.variantId, (merged.get(it.variantId) ?? 0) + it.qty);

      const lines: (VariantRow & { qty: number })[] = [];
      const problems: { variantId: number; available: number }[] = [];
      for (const [variantId, qty] of [...merged].sort((a, b) => a[0] - b[0])) {
        // ordem fixa de ids evita deadlock entre pedidos simultâneos
        const v = await get<VariantRow>(
          `SELECT v.id, v.product_id, v.color, v.size, v.stock, v.active AS v_active, p.name, p.price_cents, p.promo_price_cents,
                  p.active AS p_active, p.archived,
                  (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image
           FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
          variantId,
        );
        if (!v || !v.v_active || !v.p_active || v.archived) throw new OrderError("Um dos produtos não está mais disponível.", "invalid");
        if (v.stock < qty) problems.push({ variantId, available: v.stock });
        lines.push({ ...v, qty });
      }
      if (problems.length) throw new OrderError("Alguns itens não têm estoque suficiente.", "stock", problems);

      const subtotal = lines.reduce((sum, l) => sum + effectivePrice(l) * l.qty, 0);
      const quote = quoteDelivery(cfg, input.method, input.city, subtotal);
      const total = subtotal + quote.feeCents;
      const token = newToken(16);

      const orderId = await insert(
        `INSERT INTO orders (public_token, idempotency_key, customer_name, customer_phone, delivery_method, address, city, notes,
                             subtotal_cents, delivery_fee_cents, delivery_fee_pending, total_cents, payment_provider)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        token,
        input.idempotencyKey,
        input.name,
        input.phone,
        input.method,
        input.method === "delivery" ? input.address : "",
        input.method === "delivery" ? input.city : "",
        input.notes,
        subtotal,
        quote.feeCents,
        quote.pending ? 1 : 0,
        total,
        activeProvider.id,
      );
      for (const l of lines) {
        await run(
          `INSERT INTO order_items (order_id, variant_id, product_id, product_name, color, size, qty, unit_price_cents, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          orderId, l.id, l.product_id, l.name, l.color, l.size, l.qty, effectivePrice(l), l.image,
        );
        // UPDATE condicional: sob concorrência, o Postgres serializa pelo lock da linha e reavalia stock + delta >= 0.
        await moveStock({ variantId: l.id, delta: -l.qty, type: "reserva_pedido", reason: `Pedido #${orderId}`, orderId });
      }
      await run("INSERT INTO order_events (order_id, kind, detail) VALUES (?, 'created', 'Pedido criado pelo site (aguardando confirmação)')", orderId);
      return { id: orderId, token, duplicate: false };
    });
  } catch (e) {
    if (e instanceof StockError) throw new OrderError("Alguns itens não têm estoque suficiente.", "stock", e.variantId ? [{ variantId: e.variantId, available: 0 }] : []);
    // Duas requisições com a mesma chave ao mesmo tempo: a segunda bate na UNIQUE e devolve o pedido já criado.
    const again = await get<{ id: number; public_token: string }>("SELECT id, public_token FROM orders WHERE idempotency_key = ?", input.idempotencyKey);
    if (again) return { id: again.id, token: again.public_token, duplicate: true, ...(await buildOrderMessage(again.id)) };
    throw e;
  }

  return { ...result, ...(await buildOrderMessage(result.id)) };
}

export async function buildOrderMessage(orderId: number) {
  const settings = await getSettings();
  const order = (await get<MessageOrder>("SELECT * FROM orders WHERE id = ?", orderId))!;
  const items = await all<MessageItem>("SELECT product_name, color, size, qty, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id", orderId);
  const message = buildMessage(settings.whatsapp_template, settings.store_name, order, items);
  return { message, whatsappUrl: whatsappUrl(settings.whatsapp, message) };
}

export type OrderRow = {
  id: number; public_token: string; customer_name: string; customer_phone: string; delivery_method: "pickup" | "delivery";
  address: string; city: string; notes: string; subtotal_cents: number; delivery_fee_cents: number; delivery_fee_pending: number;
  total_cents: number; status: string; payment_status: string; payment_provider: string; payment_ref: string | null;
  admin_notes: string; created_at: string; updated_at: string;
};
export type OrderItemRow = { id: number; variant_id: number | null; product_name: string; color: string; size: string; qty: number; unit_price_cents: number; image: string | null };

export async function orderWithItems(id: number) {
  const order = await get<OrderRow>("SELECT * FROM orders WHERE id = ?", id);
  if (!order) return undefined;
  return {
    order,
    items: await all<OrderItemRow>("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", id),
    events: await all<{ id: number; kind: string; detail: string; created_at: string; admin_name: string | null }>(
      `SELECT e.id, e.kind, e.detail, e.created_at, a.name AS admin_name FROM order_events e LEFT JOIN admins a ON a.id = e.admin_id
       WHERE e.order_id = ? ORDER BY e.id`,
      id,
    ),
  };
}

export async function orderByToken(token: string) {
  const o = await get<{ id: number }>("SELECT id FROM orders WHERE public_token = ?", token);
  return o ? orderWithItems(o.id) : undefined;
}

export async function updateOrderStatus(orderId: number, status: string, adminId: number, note = "") {
  if (!ORDER_STATUSES.some((s) => s.key === status)) throw new OrderError("Status inválido.", "invalid");
  return tx(async () => {
    const order = await get<{ status: string }>("SELECT status FROM orders WHERE id = ? FOR UPDATE", orderId);
    if (!order) throw new OrderError("Pedido não encontrado.", "invalid");
    if (order.status === status) return;
    const items = await all<{ variant_id: number | null; qty: number }>("SELECT variant_id, qty FROM order_items WHERE order_id = ? ORDER BY variant_id", orderId);

    if (status === "canceled") {
      for (const it of items) if (it.variant_id) await moveStock({ variantId: it.variant_id, delta: it.qty, type: "devolucao_pedido", reason: `Pedido #${orderId} cancelado`, adminId, orderId });
    } else if (order.status === "canceled") {
      // Reativar um pedido cancelado precisa reservar de novo (pode falhar se o estoque acabou).
      for (const it of items) {
        if (!it.variant_id) continue;
        try {
          await moveStock({ variantId: it.variant_id, delta: -it.qty, type: "reserva_pedido", reason: `Pedido #${orderId} reativado`, adminId, orderId });
        } catch (e) {
          if (e instanceof StockError) throw new OrderError("Não há estoque suficiente para reativar este pedido.", "stock");
          throw e;
        }
      }
    }
    await run("UPDATE orders SET status = ?, updated_at = now() WHERE id = ?", status, orderId);
    await run(
      "INSERT INTO order_events (order_id, kind, detail, admin_id) VALUES (?, 'status', ?, ?)",
      orderId,
      `Status: ${statusLabel(order.status)} → ${statusLabel(status)}${note ? ` — ${note}` : ""}`,
      adminId,
    );
  });
}

export async function setPaymentStatus(orderId: number, payment: "unpaid" | "paid" | "refunded", adminId: number) {
  const order = await get<{ payment_status: string }>("SELECT payment_status FROM orders WHERE id = ?", orderId);
  if (!order || order.payment_status === payment) return;
  await run("UPDATE orders SET payment_status = ?, updated_at = now() WHERE id = ?", payment, orderId);
  await run("INSERT INTO order_events (order_id, kind, detail, admin_id) VALUES (?, 'payment', ?, ?)", orderId, `Pagamento: ${order.payment_status} → ${payment}`, adminId);
}

export async function saveAdminNotes(orderId: number, notes: string, adminId: number) {
  await run("UPDATE orders SET admin_notes = ?, updated_at = now() WHERE id = ?", notes, orderId);
  await run("INSERT INTO order_events (order_id, kind, detail, admin_id) VALUES (?, 'note', 'Observação interna atualizada', ?)", orderId, adminId);
}

export async function listOrders(opts: { status?: string; q?: string; limit?: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.status) where.push("o.status = ?"), params.push(opts.status);
  if (opts.q) {
    where.push("(o.customer_name ILIKE ? OR o.customer_phone ILIKE ? OR CAST(o.id AS TEXT) = ?)");
    params.push(`%${opts.q}%`, `%${opts.q}%`, opts.q.replace(/\D/g, ""));
  }
  return all<OrderRow & { item_count: number }>(
    `SELECT o.*, (SELECT COALESCE(SUM(qty),0) FROM order_items WHERE order_id = o.id) AS item_count FROM orders o
     ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY o.id DESC LIMIT ?`,
    ...params,
    opts.limit ?? 200,
  );
}
