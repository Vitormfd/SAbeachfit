import { SETTINGS_DEFAULTS } from "./settings-defaults";
import { slugify } from "./util";

type Conn = { query(text: string, params?: (string | number | null)[]): Promise<Record<string, unknown>[]> };

const COLORS: Record<string, string> = {
  Preto: "#2b2523",
  Rosa: "#e3b7b4",
  Areia: "#d9c4a9",
  Verde: "#8b9a7c",
  "Off-white": "#f1ebe3",
  Azul: "#8aa3b8",
  Terracota: "#b8785f",
};

type DemoProduct = {
  name: string;
  g: string;
  cat: string;
  price: number;
  promo?: number;
  featured?: boolean;
  isNew?: boolean;
  low?: number;
  stock: Record<string, Record<string, number>>; // cor -> tamanho -> qtd
};

const P = ["P", "M", "G"];
const s = (m: Record<string, number[]>): DemoProduct["stock"] =>
  Object.fromEntries(Object.entries(m).map(([c, q]) => [c, Object.fromEntries(P.map((z, i) => [z, q[i]]))]));

// DADOS FICTÍCIOS apenas para demonstração (is_demo = 1). Substitua pelo catálogo real.
const DEMO: DemoProduct[] = [
  { name: "Vestido Midi Linho", g: "vestido", cat: "vestidos", price: 18990, featured: true, isNew: true, stock: s({ Areia: [3, 5, 2], "Off-white": [4, 4, 1] }) },
  { name: "Blusa Manga Bufante", g: "blusa", cat: "blusas", price: 9990, isNew: true, stock: s({ "Off-white": [6, 6, 4], Rosa: [3, 2, 0] }) },
  { name: "Saia Plissada", g: "saia", cat: "roupas-femininas", price: 12990, promo: 10990, stock: s({ Preto: [2, 3, 3], Areia: [1, 2, 0] }) },
  { name: "Conjunto Alfaiataria", g: "conjuntoAlfaiataria", cat: "roupas-femininas", price: 23990, featured: true, stock: s({ Preto: [2, 2, 1], Terracota: [1, 3, 2] }) },
  { name: "Conjunto Fitness", g: "conjuntoFitness", cat: "conjuntos-fitness", price: 14990, featured: true, isNew: true, low: 3, stock: { Preto: { P: 5, M: 8, G: 3 }, Rosa: { M: 4 } } },
  { name: "Legging Cintura Alta", g: "legging", cat: "leggings", price: 11990, featured: true, stock: s({ Preto: [7, 9, 6], Verde: [3, 4, 2] }) },
  { name: "Top de Sustentação", g: "top", cat: "moda-fitness", price: 6990, promo: 5990, isNew: true, stock: s({ Preto: [8, 8, 5], Rosa: [4, 5, 3], Areia: [2, 1, 0] }) },
  { name: "Short Fitness", g: "short", cat: "moda-fitness", price: 7990, stock: s({ Preto: [5, 6, 4], Azul: [3, 2, 2] }) },
  { name: "Macacão Fitness", g: "macacao", cat: "moda-fitness", price: 17990, stock: s({ Verde: [0, 0, 0] }) },
  { name: "Pijama Curto Cetim", g: "pijamaCurto", cat: "pijamas-curtos", price: 11990, featured: true, isNew: true, stock: s({ Rosa: [4, 5, 3], "Off-white": [3, 4, 2] }) },
  { name: "Pijama Longo Algodão", g: "pijamaLongo", cat: "pijamas-longos", price: 13990, stock: s({ Azul: [3, 4, 3], "Off-white": [2, 3, 1] }) },
  { name: "Camisola de Cetim", g: "camisola", cat: "pijamas", price: 9990, low: 2, stock: s({ Terracota: [1, 2, 0], Preto: [1, 1, 1] }) },
];

export async function seedDemo(c: Conn, withProducts: boolean) {
  for (const [k, v] of Object.entries(SETTINGS_DEFAULTS)) {
    await c.query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", [k, v]);
  }
  const ins = async (sql: string, ...p: (string | number | null)[]) => Number((await c.query(`${sql} RETURNING id`, p))[0].id);

  const catId: Record<string, number> = {};
  const tree: [string, string[]][] = [
    ["Roupas femininas", ["Vestidos", "Blusas"]],
    ["Moda fitness", ["Conjuntos fitness", "Leggings"]],
    ["Pijamas", ["Pijamas curtos", "Pijamas longos"]],
  ];
  for (const [i, [name, subs]] of tree.entries()) {
    const id = await ins("INSERT INTO categories (parent_id, name, slug, position) VALUES (?, ?, ?, ?)", null, name, slugify(name), i);
    catId[slugify(name)] = id;
    for (const [j, sub] of subs.entries()) {
      catId[slugify(sub)] = await ins("INSERT INTO categories (parent_id, name, slug, position) VALUES (?, ?, ?, ?)", id, sub, slugify(sub), j);
    }
  }

  if (!withProducts) return;

  for (const p of DEMO) {
    const id = await ins(
      `INSERT INTO products (slug, name, description, price_cents, promo_price_cents, category_id, featured, is_new, low_stock_threshold, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      slugify(p.name),
      p.name,
      "Produto de demonstração. Substitua esta descrição pelo texto real: tecido, caimento, modelagem e cuidados de lavagem.",
      p.price,
      p.promo ?? null,
      catId[p.cat],
      p.featured ? 1 : 0,
      p.isNew ? 1 : 0,
      p.low ?? 2,
    );
    let img = 0;
    for (const color of Object.keys(p.stock)) {
      await c.query("INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)", [id, `/demo/${p.g}-${slugify(color)}.svg`, img++]);
      await c.query("INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)", [id, `/demo/fabric-${slugify(color)}.svg`, img++]);
    }
    let pos = 0;
    for (const [color, sizes] of Object.entries(p.stock)) {
      for (const [size, qty] of Object.entries(sizes)) {
        const vid = await ins("INSERT INTO variants (product_id, color, color_hex, size, stock, position) VALUES (?, ?, ?, ?, ?, ?)", id, color, COLORS[color], size, qty, pos++);
        await c.query("INSERT INTO stock_movements (variant_id, type, delta, stock_after, reason) VALUES (?, 'inicial', ?, ?, 'Estoque inicial (demonstração)')", [vid, qty, qty]);
      }
    }
  }
}
