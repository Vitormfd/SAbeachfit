import Link from "next/link";
import { movementHistory, MOVEMENT_LABELS, stockRows } from "@/lib/stock";
import { formatDateTime } from "@/lib/util";
import { Flash, spOne, type SP } from "@/components/AdminBits";
import { SubmitButton } from "@/components/admin";
import { stockMovementAction } from "../actions";

export const metadata = { title: "Estoque" };

export default async function Estoque({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filter = (["low", "out"].includes(spOne(sp.filtro)) ? spOne(sp.filtro) : "all") as "all" | "low" | "out";
  const q = spOne(sp.q);
  const variantId = parseInt(spOne(sp.variante), 10) || undefined;
  const rows = (await stockRows(filter, q)).filter((r) => !variantId || r.variant_id === variantId);
  const history = await movementHistory({ variantId, limit: 80 });
  const back = `/admin/estoque${variantId ? `?variante=${variantId}` : filter !== "all" ? `?filtro=${filter}` : ""}`;
  const tabs: [string, string][] = [["all", "Todos"], ["low", "Estoque baixo"], ["out", "Esgotados"]];

  return (
    <>
      <div className="admin-head"><h1>Estoque</h1></div>
      <Flash sp={sp} />
      <div className="toolbar">
        <div className="seg">
          {tabs.map(([k, label]) => <Link key={k} href={k === "all" ? "/admin/estoque" : `/admin/estoque?filtro=${k}`} aria-current={filter === k && !variantId ? "true" : undefined}>{label}</Link>)}
        </div>
        <form method="get"><input type="hidden" name="filtro" value={filter} /><input type="search" name="q" defaultValue={q} placeholder="Buscar produto" /></form>
      </div>
      {variantId && <p className="muted"><Link href="/admin/estoque">← Ver todas as variações</Link></p>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Variação</th><th>Saldo</th><th>Movimentar</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.variant_id}>
                <td><Link href={`/admin/produtos/${r.product_id}`}>{r.product_name}</Link></td>
                <td>{r.color} / {r.size}</td>
                <td>{r.stock === 0 ? <span className="danger-text">Esgotado</span> : r.stock <= r.threshold ? <span className="warn-text">{r.stock} (baixo)</span> : r.stock}</td>
                <td>
                  <form action={stockMovementAction} className="move-form">
                    <input type="hidden" name="variant_id" value={r.variant_id} />
                    <input type="hidden" name="back" value={back} />
                    <select name="kind" aria-label="Tipo"><option value="entrada">Entrada (+)</option><option value="saida">Saída (−)</option><option value="ajuste">Ajuste (definir saldo)</option></select>
                    <input name="qty" type="number" min={0} required placeholder="Qtd" aria-label="Quantidade" />
                    <input name="reason" required placeholder="Motivo" maxLength={200} aria-label="Motivo" />
                    <SubmitButton className="btn btn-ghost" pending="…">Aplicar</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="muted center">Nenhuma variação encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Histórico de movimentações</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Produto / variação</th><th>Tipo</th><th>Qtd</th><th>Saldo</th><th>Motivo</th><th>Responsável</th></tr></thead>
            <tbody>
              {history.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td>{m.product_name}<small className="block muted">{m.color} / {m.size}</small></td>
                  <td>{MOVEMENT_LABELS[m.type] ?? m.type}</td>
                  <td className={m.delta > 0 ? "ok-text" : "danger-text"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td>{m.stock_after}</td>
                  <td>{m.reason}{m.order_id ? <> · <Link href={`/admin/pedidos/${m.order_id}`}>pedido</Link></> : null}</td>
                  <td>{m.admin_name ?? "Sistema / cliente"}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={7} className="muted center">Sem movimentações.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
