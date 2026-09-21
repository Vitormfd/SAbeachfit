import { notFound } from "next/navigation";
import { productById } from "@/lib/catalog";
import { centsToInput } from "@/lib/util";
import { movementHistory, MOVEMENT_LABELS } from "@/lib/stock";
import { formatDateTime } from "@/lib/util";
import { ProductForm } from "@/components/ProductForm";
import { categoryOptions } from "../categoryOptions";
import { get } from "@/lib/db";

export const metadata = { title: "Editar produto" };

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await productById(parseInt(id, 10));
  if (!p) notFound();
  const history = await movementHistory({ productId: p.id, limit: 15 });
  const hasOrders = !!await get("SELECT 1 FROM order_items WHERE product_id = ?", p.id);
  return (
    <>
      <div className="admin-head">
        <h1>Editar produto</h1>
        {p.active && !p.archived && <a className="btn btn-ghost" href={`/produto/${p.slug}`} target="_blank">Ver na loja ↗</a>}
      </div>
      {hasOrders && <p className="muted small">Este produto já possui pedidos: ao excluí-lo ele será apenas arquivado.</p>}
      <ProductForm
        categories={await categoryOptions()}
        initial={{
          id: p.id,
          name: p.name,
          description: p.description,
          price: centsToInput(p.price_cents),
          promo: centsToInput(p.promo_price_cents),
          category_id: p.category_id,
          active: !!p.active,
          featured: !!p.featured,
          is_new: !!p.is_new,
          threshold: p.low_stock_threshold,
          images: p.images.map((i) => i.url),
          variants: p.variants.filter((v) => v.active).map((v) => ({ color: v.color, hex: v.color_hex, size: v.size, stock: v.stock })),
        }}
      />
      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Últimas movimentações de estoque</h2>
        {history.length === 0 ? <p className="muted">Sem movimentações.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Data</th><th>Variação</th><th>Tipo</th><th>Qtd</th><th>Saldo</th><th>Motivo</th></tr></thead><tbody>
            {history.map((m) => <tr key={m.id}><td>{formatDateTime(m.created_at)}</td><td>{m.color} / {m.size}</td><td>{MOVEMENT_LABELS[m.type]}</td><td>{m.delta > 0 ? `+${m.delta}` : m.delta}</td><td>{m.stock_after}</td><td>{m.reason}</td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
