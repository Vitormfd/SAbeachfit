"use client";
import { useActionState, useState } from "react";
import { saveProduct } from "@/app/admin/(panel)/actions";
import { SIZES_PRESET } from "@/lib/util";
import { ImageUploader } from "./ImageUploader";

type Cat = { id: number; label: string };
export type ProductInitial = {
  id?: number; name: string; description: string; price: string; promo: string; category_id: number | null;
  active: boolean; featured: boolean; is_new: boolean; threshold: number;
  images: string[];
  variants: { color: string; hex: string; size: string; stock: number }[];
};

const COLOR_PRESETS: [string, string][] = [
  ["Preto", "#2b2523"], ["Off-white", "#f1ebe3"], ["Areia", "#d9c4a9"], ["Rosa", "#e3b7b4"], ["Verde", "#8b9a7c"], ["Azul", "#8aa3b8"], ["Terracota", "#b8785f"], ["Vermelho", "#b23a3a"], ["Branco", "#ffffff"],
];

export function ProductForm({ initial, categories }: { initial: ProductInitial; categories: Cat[] }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [images, setImages] = useState<string[]>(initial.images);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>(() => {
    const m = new Map<string, string>();
    initial.variants.forEach((v) => m.set(v.color, v.hex));
    return [...m].map(([name, hex]) => ({ name, hex }));
  });
  const [sizes, setSizes] = useState<string[]>(() => [...new Set(initial.variants.map((v) => v.size))]);
  const [stock, setStock] = useState<Record<string, string>>(() => Object.fromEntries(initial.variants.map((v) => [`${v.color}|${v.size}`, String(v.stock)])));
  const [newColor, setNewColor] = useState("");
  const [newHex, setNewHex] = useState("#d9c4a9");
  const [newSize, setNewSize] = useState("");

  const variants = colors.flatMap((c) =>
    sizes.flatMap((z) => {
      const raw = stock[`${c.name}|${z}`];
      if (raw === undefined || raw === "") return [];
      return [{ color: c.name, hex: c.hex, size: z, stock: Math.max(0, parseInt(raw, 10) || 0) }];
    }),
  );

  const addColor = (name: string, hex: string) => {
    name = name.trim();
    if (!name || colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setColors([...colors, { name, hex }]);
    setNewColor("");
  };
  const addSize = (z: string) => {
    z = z.trim();
    if (!z || sizes.some((s) => s.toLowerCase() === z.toLowerCase())) return;
    setSizes([...sizes, z]);
    setNewSize("");
  };
  const total = variants.reduce((n, v) => n + v.stock, 0);

  return (
    <form action={action} className="stack product-form">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <section className="panel">
        <h2>Informações</h2>
        <label>Nome *<input name="name" defaultValue={initial.name} required minLength={2} maxLength={120} /></label>
        <label>Descrição<textarea name="description" defaultValue={initial.description} rows={5} maxLength={4000} /></label>
        <div className="form-grid">
          <label>Preço (R$) *<input name="price" defaultValue={initial.price} inputMode="decimal" required placeholder="149,90" /></label>
          <label>Preço promocional (R$)<input name="promo" defaultValue={initial.promo} inputMode="decimal" placeholder="opcional" /></label>
          <label>Categoria
            <select name="category_id" defaultValue={initial.category_id ?? ""}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label>Alerta de estoque baixo (≤ unidades)<input name="threshold" type="number" min={0} defaultValue={initial.threshold} /></label>
        </div>
        <div className="checks">
          <label className="check"><input type="checkbox" name="active" defaultChecked={initial.active} /> Ativo (visível na loja)</label>
          <label className="check"><input type="checkbox" name="featured" defaultChecked={initial.featured} /> Destaque</label>
          <label className="check"><input type="checkbox" name="is_new" defaultChecked={initial.is_new} /> Novidade</label>
        </div>
      </section>

      <section className="panel">
        <h2>Imagens</h2>
        <p className="muted small">A primeira imagem é a capa. JPG, PNG, WebP ou GIF até 5 MB.</p>
        <ImageUploader value={images} onChange={setImages} multiple />
      </section>

      <section className="panel">
        <h2>Variações e estoque</h2>
        <p className="muted small">Cada combinação de cor + tamanho tem estoque independente. Deixe em branco as combinações que não existem.</p>

        <div className="var-setup">
          <div>
            <h3>Cores</h3>
            <div className="chips">
              {colors.map((c) => (
                <span key={c.name} className="chip"><i style={{ background: c.hex }} />{c.name}<button type="button" aria-label={`Remover ${c.name}`} onClick={() => setColors(colors.filter((x) => x.name !== c.name))}>×</button></span>
              ))}
            </div>
            <div className="inline-add">
              <input type="color" value={newHex} onChange={(e) => setNewHex(e.target.value)} aria-label="Escolher cor" />
              <input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Nome da cor" maxLength={40} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor(newColor, newHex))} />
              <button type="button" className="btn btn-ghost" onClick={() => addColor(newColor, newHex)}>Adicionar</button>
            </div>
            <div className="chips presets">
              {COLOR_PRESETS.filter(([n]) => !colors.some((c) => c.name === n)).map(([n, h]) => (
                <button type="button" key={n} className="chip preset" onClick={() => addColor(n, h)}><i style={{ background: h }} />{n}</button>
              ))}
            </div>
          </div>
          <div>
            <h3>Tamanhos</h3>
            <div className="chips">
              {SIZES_PRESET.concat(sizes.filter((s) => !SIZES_PRESET.includes(s))).map((z) => (
                <button type="button" key={z} className="chip size-chip" aria-pressed={sizes.includes(z)} onClick={() => setSizes(sizes.includes(z) ? sizes.filter((x) => x !== z) : [...sizes, z])}>{z}</button>
              ))}
            </div>
            <div className="inline-add">
              <input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Outro tamanho" maxLength={12} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize(newSize))} />
              <button type="button" className="btn btn-ghost" onClick={() => addSize(newSize)}>Adicionar</button>
            </div>
          </div>
        </div>

        {colors.length > 0 && sizes.length > 0 ? (
          <div className="table-wrap">
            <table className="stock-grid">
              <thead>
                <tr><th>Cor \ Tamanho</th>{sizes.map((z) => <th key={z}>{z}</th>)}</tr>
              </thead>
              <tbody>
                {colors.map((c) => (
                  <tr key={c.name}>
                    <th><i className="dot" style={{ background: c.hex }} /> {c.name}</th>
                    {sizes.map((z) => {
                      const k = `${c.name}|${z}`;
                      return (
                        <td key={z}>
                          <input type="number" min={0} max={100000} inputMode="numeric" value={stock[k] ?? ""} placeholder="—" aria-label={`Estoque ${c.name} ${z}`} onChange={(e) => setStock({ ...stock, [k]: e.target.value })} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">Adicione ao menos uma cor e um tamanho para definir o estoque.</p>
        )}
        <p className="muted small">{variants.length} variação(ões) · {total} unidade(s) no total.{initial.id ? " Alterações de estoque aqui são registradas no histórico como ajuste." : ""}</p>
      </section>

      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar produto"}</button>
        <a href="/admin/produtos" className="btn btn-ghost">Cancelar</a>
      </div>
    </form>
  );
}
