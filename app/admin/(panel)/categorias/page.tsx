import { all } from "@/lib/db";
import type { Category } from "@/lib/catalog";
import { Flash, type SP } from "@/components/AdminBits";
import { ConfirmButton, SubmitButton } from "@/components/admin";
import { deleteCategory, moveCategory, saveCategory } from "../actions";

export const metadata = { title: "Categorias" };

export default async function Categorias({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rows = await all<Category & { products: number }>(
    "SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.archived = 0) AS products FROM categories c ORDER BY position, name",
  );
  const roots = rows.filter((r) => r.parent_id === null);

  const Row = ({ c, child }: { c: Category & { products: number }; child?: boolean }) => (
    <li className={child ? "cat-row child" : "cat-row"}>
      <form action={saveCategory} className="cat-edit">
        <input type="hidden" name="id" value={c.id} />
        <input name="name" defaultValue={c.name} required minLength={2} aria-label="Nome" />
        <select name="parent_id" defaultValue={c.parent_id ?? ""} aria-label="Categoria pai">
          <option value="">— Categoria principal —</option>
          {roots.filter((r) => r.id !== c.id).map((r) => <option key={r.id} value={r.id}>Dentro de {r.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" name="active" defaultChecked={!!c.active} /> Ativa</label>
        <SubmitButton className="btn btn-ghost">Salvar</SubmitButton>
        <span className="muted small">{c.products} produto(s) · /{c.slug}</span>
      </form>
      <div className="cat-tools">
        <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><button name="dir" value="up" className="icon-sm" aria-label="Subir">↑</button><button name="dir" value="down" className="icon-sm" aria-label="Descer">↓</button></form>
        <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><ConfirmButton className="link-btn danger-text" message={`Excluir "${c.name}"? Os produtos ficarão sem categoria.`}>Excluir</ConfirmButton></form>
      </div>
    </li>
  );

  return (
    <>
      <div className="admin-head"><h1>Categorias</h1></div>
      <Flash sp={sp} />
      <section className="panel">
        <h2>Nova categoria</h2>
        <form action={saveCategory} className="inline-form">
          <input name="name" placeholder="Nome (ex.: Moda praia)" required minLength={2} />
          <select name="parent_id" defaultValue="">
            <option value="">Categoria principal</option>
            {roots.map((r) => <option key={r.id} value={r.id}>Subcategoria de {r.name}</option>)}
          </select>
          <SubmitButton>Criar</SubmitButton>
        </form>
      </section>
      <section className="panel">
        <h2>Estrutura</h2>
        <p className="muted small">Use ↑ ↓ para reorganizar dentro do mesmo nível. Dois níveis: categoria › subcategoria.</p>
        <ul className="cat-list">
          {roots.map((c) => (
            <li key={c.id}>
              <ul className="cat-list">
                <Row c={c} />
                {rows.filter((x) => x.parent_id === c.id).map((ch) => <Row key={ch.id} c={ch} child />)}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
