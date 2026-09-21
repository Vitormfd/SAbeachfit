import Link from "next/link";
import { notFound } from "next/navigation";
import { buildOrderMessage, orderWithItems } from "@/lib/orders";
import { formatDateTime, formatMoney, onlyDigits, orderNumber, ORDER_STATUSES, PAYMENT_LABELS } from "@/lib/util";
import { Flash, StatusBadge, type SP } from "@/components/AdminBits";
import { SubmitButton } from "@/components/admin";
import { orderUpdateAction } from "../../actions";

export const metadata = { title: "Pedido" };

export default async function PedidoDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await orderWithItems(parseInt(id, 10));
  if (!data) notFound();
  const { order, items, events } = data;
  const phone = onlyDigits(order.customer_phone);
  const { message } = await buildOrderMessage(order.id);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="muted small"><Link href="/admin/pedidos">← Pedidos</Link></p>
          <h1>Pedido {orderNumber(order.id)} <StatusBadge status={order.status} /></h1>
          <p className="muted">{formatDateTime(order.created_at)} · Pagamento: <strong>{PAYMENT_LABELS[order.payment_status]}</strong></p>
        </div>
        {phone.length >= 10 && (
          <a className="btn btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${phone.length <= 11 ? "55" + phone : phone}`}>Conversar com a cliente ↗</a>
        )}
      </div>
      <Flash sp={sp} />

      <div className="two-col">
        <section className="panel">
          <h2>Itens</h2>
          <ul className="rows">
            {items.map((i) => (
              <li key={i.id}><div className="row-flex">
                {i.image && /* eslint-disable-next-line @next/next/no-img-element */ <img className="thumb" src={i.image} alt="" width={44} height={55} />}
                <span>{i.qty}× {i.product_name}<small>{i.color} / {i.size} · {formatMoney(i.unit_price_cents)} cada</small></span>
                <strong>{formatMoney(i.unit_price_cents * i.qty)}</strong></div></li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{formatMoney(order.subtotal_cents)}</dd></div>
            <div><dt>Entrega</dt><dd>{order.delivery_method === "pickup" ? "Retirada" : order.delivery_fee_pending ? "A combinar" : formatMoney(order.delivery_fee_cents)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{formatMoney(order.total_cents)}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2>Cliente e recebimento</h2>
          <dl className="kv">
            <dt>Nome</dt><dd>{order.customer_name}</dd>
            <dt>Telefone</dt><dd>{order.customer_phone || "—"}</dd>
            <dt>Recebimento</dt><dd>{order.delivery_method === "pickup" ? "Retirada" : "Entrega"}</dd>
            {order.delivery_method === "delivery" && (<><dt>Endereço</dt><dd>{order.address}</dd></>)}
            <dt>Observações da cliente</dt><dd style={{ whiteSpace: "pre-line" }}>{order.notes || "—"}</dd>
          </dl>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Atualizar pedido</h2>
          <form action={orderUpdateAction} className="stack">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="op" value="status" />
            <label>Status
              <select name="status" defaultValue={order.status}>
                {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label>Nota (opcional, vai para o histórico)<input name="note" maxLength={200} /></label>
            <SubmitButton pending="Atualizando…">Atualizar status</SubmitButton>
            <p className="muted small">Cancelar devolve as unidades ao estoque. Reativar um pedido cancelado reserva o estoque novamente.</p>
          </form>
          <hr />
          <form action={orderUpdateAction} className="inline-form">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="op" value="payment" />
            <label>Pagamento
              <select name="payment" defaultValue={order.payment_status}>
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <SubmitButton className="btn btn-ghost">Registrar</SubmitButton>
          </form>
        </section>

        <section className="panel">
          <h2>Observações internas</h2>
          <form action={orderUpdateAction} className="stack">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="op" value="notes" />
            <textarea name="admin_notes" rows={4} defaultValue={order.admin_notes} maxLength={2000} placeholder="Ex.: pagamento via Pix confirmado às 14h; entrega combinada para sexta." />
            <SubmitButton className="btn btn-ghost">Salvar observação</SubmitButton>
          </form>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Histórico</h2>
          <ul className="timeline">
            {events.map((e) => <li key={e.id}><span>{e.detail}</span><small>{formatDateTime(e.created_at)}{e.admin_name ? ` · ${e.admin_name}` : ""}</small></li>)}
          </ul>
        </section>
        <section className="panel">
          <h2>Mensagem enviada ao WhatsApp</h2>
          <pre className="msg">{message}</pre>
        </section>
      </div>
    </>
  );
}
