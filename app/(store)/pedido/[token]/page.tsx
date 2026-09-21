import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { buildOrderMessage, orderByToken } from "@/lib/orders";
import { formatMoney, orderNumber, statusLabel } from "@/lib/util";

export const metadata: Metadata = { title: "Pedido registrado", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  const data = await orderByToken(token);
  if (!data) notFound();
  const { order, items } = data;
  const { whatsappUrl } = await buildOrderMessage(order.id);

  return (
    <div className="container page narrow">
      <div className="panel center">
        <p className="kicker">Pedido {orderNumber(order.id)}</p>
        <h1 className="page-title">Pedido registrado!</h1>
        <p>
          Obrigada, {order.customer_name.split(" ")[0]}. Se o WhatsApp não abriu, toque no botão abaixo para enviar o pedido à loja. O pedido só é confirmado após a resposta da loja.
        </p>
        <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          Abrir WhatsApp e enviar pedido
        </a>
        <p className="muted small">
          Status atual: <strong>{statusLabel(order.status)}</strong>
        </p>
      </div>
      <div className="panel">
        <h2>Resumo</h2>
        <ul className="mini-list">
          {items.map((i) => (
            <li key={i.id}>
              <span>
                {i.qty}× {i.product_name}
                <small>
                  {i.color} / {i.size}
                </small>
              </span>
              <span>{formatMoney(i.unit_price_cents * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{formatMoney(order.subtotal_cents)}</dd></div>
          <div><dt>Entrega</dt><dd>{order.delivery_method === "pickup" ? "Retirada" : order.delivery_fee_pending ? "A combinar" : formatMoney(order.delivery_fee_cents)}</dd></div>
          <div className="total"><dt>Total</dt><dd>{formatMoney(order.total_cents)}</dd></div>
        </dl>
      </div>
      <p className="center">
        <Link href="/catalogo" className="link-arrow">Continuar comprando →</Link>
      </p>
    </div>
  );
}
