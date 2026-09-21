import Link from "next/link";
import { all, get } from "@/lib/db";
import { currentAdmin } from "@/lib/auth";
import { effectivePrice, formatMoney } from "@/lib/util";
import { Flash, spOne, type SP } from "@/components/AdminBits";
import { ConfirmButton, SubmitButton } from "@/components/admin";
import { deleteDemoData, productAction } from "../actions";

export const metadata = { title: "Produtos" };

type Row = {
  id: number; name: string; price_cents: number; promo_price_cents: number | null; active: number; archived: number; featured: number; is_new: number;
  is_demo: number; category: string | null; image: string | null; stock: number; low: number;
};

export default async function Produtos({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const admin = await currentAdmin();
  const filter = spOne(sp.filtro) || "todos";
  const q = spOne(sp.q);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter === "arquivados") where.push("p.archived = 1");
  else where.push("p.archived = 0");
  if (filter === "inativos") where.push("p.active = 0");
  if (filter === "disponiveis") where.push("p.active = 1 AND EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.active = 1 AND v.stock > 0)");
  if (filter === "indisponiveis") where.push("(p.active = 0 OR NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.active = 1 AND v.stock > 0))");
  if (q) where.push("p.name LIKE ?"), params.push(`%${q}%`);
  const rows = await all<Row>(
    `SELECT p.id, p.name, p.price_cents, p.promo_price_cents, p.active, p.archived, p.featured, p.is_new, p.is_demo, c.name AS category,
            (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image,
            COALESCE((SELECT SUM(stock) FROM variants v WHERE v.product_id = p.id AND v.active = 1), 0) AS stock,
            COALESCE((SELECT COUNT(*) FROM variants v WHERE v.product_id = p.id AND v.active = 1 AND v.stock <= p.low_stock_threshold), 0) AS low
     FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(" AND ")} ORDER BY p.id DESC`,
    ...params,
  );
  const demoCount = (await get<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE is_demo = 1 AND archived = 0"))!.n;
  const tabs = [["todos", "Ativos"], ["disponiveis", "Disponíveis"], ["indisponiveis", "Indisponíveis"], ["inativos", "Desativados"], ["arquivados", "Arquivados"]];

  return (
    <>
      <div className="admin-head">
        <h1>Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary">+ Novo produto</Link>
      </div>
      <Flash sp={sp} />
      {demoCount > 0 && admin?.role === "owner" && (
        <div className="notice warn row-between">
          <span>Há {demoCount} produto(s) de <strong>demonstração</strong> (fictícios). Remova-os antes de publicar a loja.</span>
          <form action={deleteDemoData}><SubmitButton className="btn btn-ghost" pending="Removendo…" confirm="Remover todos os produtos de demonstração?">Remover demonstração</SubmitButton></form>
        </div>
      )}
      <div className="toolbar">
        <div className="seg">
          {tabs.map(([k, label]) => (
            <Link key={k} href={`/admin/produtos?filtro=${k}`} aria-current={filter === k ? "true" : undefined}>{label}</Link>
          ))}
        </div>
        <form method="get"><input type="hidden" name="filtro" value={filter} /><input type="search" name="q" defaultValue={q} placeholder="Buscar produto" /></form>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.image && /* eslint-disable-next-line @next/next/no-img-element */ <img className="thumb" src={p.image} alt="" width={44} height={55} loading="lazy" />}</td>
                <td><Link href={`/admin/produtos/${p.id}`}><strong>{p.name}</strong></Link>{p.is_demo ? <span className="badge ghost inline">demo</span> : null}
                  <div className="tags">{p.featured ? <span>Destaque</span> : null}{p.is_new ? <span>Novidade</span> : null}</div></td>
                <td>{p.category ?? "—"}</td>
                <td>{p.promo_price_cents != null ? <><s className="muted">{formatMoney(p.price_cents)}</s> {formatMoney(effectivePrice(p))}</> : formatMoney(p.price_cents)}</td>
                <td>{p.stock <= 0 ? <span className="danger-text">Esgotado</span> : p.low > 0 ? <span className="warn-text">{p.stock} un. (baixo)</span> : `${p.stock} un.`}</td>
                <td>{p.archived ? "Arquivado" : p.active ? "Ativo" : "Desativado"}</td>
                <td className="actions">
                  <Link href={`/admin/produtos/${p.id}`}>Editar</Link>
                  <form action={productAction}>
                    <input type="hidden" name="id" value={p.id} />
                    {p.archived ? (
                      <button name="op" value="restore" className="link-btn">Restaurar</button>
                    ) : (
                      <>
                        <button name="op" value="toggle" className="link-btn">{p.active ? "Desativar" : "Ativar"}</button>
                        <button name="op" value="archive" className="link-btn">Arquivar</button>
                      </>
                    )}
                    <ConfirmButton name="op" value="delete" className="link-btn danger-text" message={`Excluir "${p.name}"? Se houver pedidos, ele será apenas arquivado.`}>Excluir</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="muted center">Nenhum produto.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
