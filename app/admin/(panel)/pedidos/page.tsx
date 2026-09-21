import Link from "next/link";
import { listOrders } from "@/lib/orders";
import { formatDateTime, formatMoney, orderNumber, ORDER_STATUSES, PAYMENT_LABELS } from "@/lib/util";
import { Flash, StatusBadge, spOne, type SP } from "@/components/AdminBits";

export const metadata = { title: "Pedidos" };

export default async function Pedidos({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.some((s) => s.key === spOne(sp.status)) ? spOne(sp.status) : "";
  const q = spOne(sp.q);
  const orders = await listOrders({ status: status || undefined, q: q || undefined });
  return (
    <>
      <div className="admin-head"><h1>Pedidos</h1></div>
      <Flash sp={sp} />
      <div className="toolbar">
        <div className="seg scroll">
          <Link href="/admin/pedidos" aria-current={!status ? "true" : undefined}>Todos</Link>
          {ORDER_STATUSES.map((s) => <Link key={s.key} href={`/admin/pedidos?status=${s.key}`} aria-current={status === s.key ? "true" : undefined}>{s.label}</Link>)}
        </div>
        <form method="get"><input type="hidden" name="status" value={status} /><input type="search" name="q" defaultValue={q} placeholder="Nome, telefone ou nº" /></form>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Recebimento</th><th>Total</th><th>Pagamento</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/pedidos/${o.id}`}><strong>{orderNumber(o.id)}</strong></Link></td>
                <td>{formatDateTime(o.created_at)}</td>
                <td>{o.customer_name}<small className="block muted">{o.customer_phone}</small></td>
                <td>{o.item_count}</td>
                <td>{o.delivery_method === "pickup" ? "Retirada" : "Entrega"}</td>
                <td>{formatMoney(o.total_cents)}</td>
                <td>{PAYMENT_LABELS[o.payment_status]}</td>
                <td><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} className="muted center">Nenhum pedido.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
