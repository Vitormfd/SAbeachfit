import Link from "next/link";
import { dashboardStats } from "@/lib/dashboard";
import { formatDateTime, formatMoney, orderNumber } from "@/lib/util";
import { Flash, StatusBadge, spOne, type SP } from "@/components/AdminBits";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(parseInt(spOne(sp.dias))) ? parseInt(spOne(sp.dias)) : 30;
  const d = await dashboardStats(days);
  const max = Math.max(1, ...d.series.map((s) => s.cents));

  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
        <div className="seg" role="group" aria-label="Período">
          {[7, 30, 90].map((n) => (
            <Link key={n} href={`/admin?dias=${n}`} aria-current={n === days ? "true" : undefined}>
              {n} dias
            </Link>
          ))}
        </div>
      </div>
      <Flash sp={sp} />

      <div className="stats">
        <div className="stat"><span>Pedidos ({days} dias)</span><strong>{d.counts.total}</strong></div>
        <div className="stat warn"><span>Aguardando confirmação</span><strong>{d.counts.awaiting ?? 0}</strong></div>
        <div className="stat"><span>Confirmados ou adiante</span><strong>{d.counts.confirmed ?? 0}</strong></div>
        <div className="stat"><span>Faturamento registrado</span><strong>{formatMoney(d.revenue.cents)}</strong><small>{d.revenue.n} pedido(s) pago(s)</small></div>
        <div className="stat"><span>A receber (em aberto)</span><strong>{formatMoney(d.pendingValue)}</strong></div>
        <Link href="/admin/estoque?filtro=low" className="stat warn"><span>Produtos com estoque baixo</span><strong>{d.lowProducts}</strong></Link>
        <Link href="/admin/estoque?filtro=out" className="stat danger"><span>Produtos esgotados</span><strong>{d.outProducts}</strong></Link>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Vendas por dia</h2>
          {d.series.length === 0 ? (
            <p className="muted">Ainda não há pedidos neste período.</p>
          ) : (
            <div className="bars" role="img" aria-label="Faturamento pago por dia">
              {d.series.map((s) => (
                <div key={s.day} className="bar" title={`${s.day}: ${formatMoney(s.cents)} · ${s.orders} pedido(s)`}>
                  <span style={{ height: `${Math.max(3, (s.cents / max) * 100)}%` }} />
                  <small>{s.day.slice(8)}/{s.day.slice(5, 7)}</small>
                </div>
              ))}
            </div>
          )}
          <p className="muted small">Barras = faturamento de pedidos marcados como pagos.</p>
        </section>

        <section className="panel">
          <h2>Pedidos recentes</h2>
          {d.recent.length === 0 ? (
            <p className="muted">Nenhum pedido ainda.</p>
          ) : (
            <ul className="rows">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`}>
                    <span><strong>{orderNumber(o.id)}</strong> {o.customer_name}<small>{formatDateTime(o.created_at)}</small></span>
                    <span>{formatMoney(o.total_cents)} <StatusBadge status={o.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Estoque baixo</h2>
          {d.low.length === 0 ? <p className="muted">Nada com estoque baixo.</p> : (
            <ul className="rows">
              {d.low.map((l) => (
                <li key={l.variant_id}><Link href={`/admin/estoque?variante=${l.variant_id}`}><span>{l.name}<small>{l.color} / {l.size}</small></span><strong className="warn-text">{l.stock} un.</strong></Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2>Sem estoque</h2>
          {d.out.length === 0 ? <p className="muted">Nenhuma variação esgotada.</p> : (
            <ul className="rows">
              {d.out.map((l) => (
                <li key={l.variant_id}><Link href={`/admin/estoque?variante=${l.variant_id}`}><span>{l.name}<small>{l.color} / {l.size}</small></span><strong className="danger-text">0</strong></Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
