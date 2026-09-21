import "server-only";
import { all, get } from "./db";

export type Category = { id: number; parent_id: number | null; name: string; slug: string; position: number; active: number };

export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  price_cents: number;
  promo_price_cents: number | null;
  featured: number;
  is_new: number;
  is_demo: number;
  category_id: number | null;
  image: string | null;
  image2: string | null;
  total_stock: number;
  colors: string; // "Nome|#hex,Nome|#hex"
  variants: string; // "id:cor:#hex:tam:estoque;..."
};

export type Variant = { id: number; product_id: number; color: string; color_hex: string; size: string; stock: number; active: number; position: number };

const TOTAL_STOCK = "COALESCE((SELECT SUM(stock) FROM variants v WHERE v.product_id = p.id AND v.active = 1), 0)";

const CARD_SELECT = `
  p.id, p.slug, p.name, p.price_cents, p.promo_price_cents, p.featured, p.is_new, p.is_demo, p.category_id,
  (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image,
  (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1 OFFSET 1) AS image2,
  ${TOTAL_STOCK} AS total_stock,
  COALESCE((SELECT string_agg(color || '|' || color_hex, ',' ORDER BY pos)
            FROM (SELECT color, color_hex, MIN(position) AS pos FROM variants v WHERE v.product_id = p.id AND v.active = 1 GROUP BY color, color_hex) t), '') AS colors,
  COALESCE((SELECT string_agg(v.id::text || ':' || v.color || ':' || v.color_hex || ':' || v.size || ':' || v.stock::text, ';' ORDER BY v.position, v.id)
            FROM variants v WHERE v.product_id = p.id AND v.active = 1), '') AS variants`;

const VISIBLE = "p.active = 1 AND p.archived = 0";

export async function categoryTree() {
  const rows = await all<Category>("SELECT * FROM categories WHERE active = 1 ORDER BY position, name");
  return rows.filter((c) => c.parent_id === null).map((c) => ({ ...c, children: rows.filter((x) => x.parent_id === c.id) }));
}

export async function categoryBySlug(slug: string) {
  return get<Category>("SELECT * FROM categories WHERE slug = ? AND active = 1", slug);
}

/** ids da categoria + subcategorias. */
async function categoryIds(id: number): Promise<number[]> {
  return [id, ...(await all<{ id: number }>("SELECT id FROM categories WHERE parent_id = ?", id)).map((r) => r.id)];
}

async function categoryFilter(slug: string): Promise<{ sql: string; ids: number[] }> {
  const cat = await categoryBySlug(slug);
  const ids = cat ? await categoryIds(cat.id) : [-1];
  return { sql: `p.category_id IN (${ids.map(() => "?").join(",")})`, ids };
}

export type CatalogQuery = {
  category?: string;
  size?: string;
  color?: string;
  min?: number;
  max?: number;
  sort?: "relevancia" | "novidades" | "menor-preco" | "maior-preco";
  page?: number;
  pageSize: number;
  q?: string;
  showOutOfStock?: boolean;
};

export async function queryProducts(q: CatalogQuery) {
  const where: string[] = [VISIBLE];
  const params: (string | number)[] = [];
  if (q.category) {
    const f = await categoryFilter(q.category);
    where.push(f.sql);
    params.push(...f.ids);
  }
  if (q.size || q.color) {
    let sub = "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.active = 1";
    if (q.size) (sub += " AND v.size = ?"), params.push(q.size);
    if (q.color) (sub += " AND v.color = ?"), params.push(q.color);
    where.push(sub + ")");
  }
  const eff = "COALESCE(CASE WHEN p.promo_price_cents < p.price_cents THEN p.promo_price_cents END, p.price_cents)";
  if (q.min != null) where.push(`${eff} >= ?`), params.push(q.min);
  if (q.max != null) where.push(`${eff} <= ?`), params.push(q.max);
  if (q.q) {
    where.push("(p.name ILIKE ? OR p.description ILIKE ?)");
    params.push(`%${q.q}%`, `%${q.q}%`);
  }
  if (!q.showOutOfStock) where.push("EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.active = 1 AND v.stock > 0)");

  const sold = "COALESCE((SELECT SUM(oi.qty) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status <> 'canceled'), 0)";
  const order =
    q.sort === "menor-preco"
      ? `${eff} ASC, p.id DESC`
      : q.sort === "maior-preco"
        ? `${eff} DESC, p.id DESC`
        : q.sort === "novidades"
          ? "p.is_new DESC, p.created_at DESC, p.id DESC"
          : `(${TOTAL_STOCK} > 0) DESC, p.featured DESC, ${sold} DESC, p.id DESC`;

  const whereSql = where.join(" AND ");
  const total = (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM products p WHERE ${whereSql}`, ...params))!.n;
  const pages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page ?? 1), pages);
  const items = await all<ProductCard>(
    `SELECT ${CARD_SELECT} FROM products p WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    ...params,
    q.pageSize,
    (page - 1) * q.pageSize,
  );
  return { items, total, page, pages };
}

export async function featuredProducts(limit = 8, opts: { onlyNew?: boolean; categorySlug?: string } = {}) {
  const where = [VISIBLE, "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.active = 1 AND v.stock > 0)"];
  const params: (string | number)[] = [];
  if (opts.onlyNew) where.push("p.is_new = 1");
  else if (!opts.categorySlug) where.push("p.featured = 1");
  if (opts.categorySlug) {
    const f = await categoryFilter(opts.categorySlug);
    where.push(f.sql);
    params.push(...f.ids);
  }
  return all<ProductCard>(`SELECT ${CARD_SELECT} FROM products p WHERE ${where.join(" AND ")} ORDER BY p.featured DESC, p.id DESC LIMIT ?`, ...params, limit);
}

export async function relatedProducts(productId: number, categoryId: number | null, limit = 4) {
  return all<ProductCard>(
    `SELECT ${CARD_SELECT} FROM products p WHERE ${VISIBLE} AND p.id <> ?
     ORDER BY (p.category_id IS NOT DISTINCT FROM ?::int) DESC, p.featured DESC, p.id DESC LIMIT ?`,
    productId,
    categoryId,
    limit,
  );
}

export async function facets() {
  const sizes = (
    await all<{ size: string }>(`SELECT DISTINCT v.size FROM variants v JOIN products p ON p.id = v.product_id WHERE ${VISIBLE} AND v.active = 1 ORDER BY v.size`)
  ).map((r) => r.size);
  const colors = await all<{ color: string; color_hex: string }>(
    `SELECT v.color, MIN(v.color_hex) AS color_hex FROM variants v JOIN products p ON p.id = v.product_id WHERE ${VISIBLE} AND v.active = 1 GROUP BY v.color ORDER BY v.color`,
  );
  return { sizes: sortSizes(sizes), colors };
}

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "Único"];
export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, "pt-BR", { numeric: true });
  });
}

export type ProductFull = {
  id: number; slug: string; name: string; description: string; price_cents: number; promo_price_cents: number | null;
  category_id: number | null; active: number; archived: number; featured: number; is_new: number; low_stock_threshold: number; is_demo: number;
  category_name: string | null; category_slug: string | null;
};

export async function productBySlug(slug: string) {
  const p = await get<ProductFull>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND ${VISIBLE}`,
    slug,
  );
  return p ? withDetails(p) : undefined;
}

export async function productById(id: number) {
  const p = await get<ProductFull>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    id,
  );
  return p ? withDetails(p, true) : undefined;
}

async function withDetails(p: ProductFull, includeInactive = false) {
  const images = await all<{ id: number; url: string }>("SELECT id, url FROM product_images WHERE product_id = ? ORDER BY position, id", p.id);
  const variants = await all<Variant>(
    `SELECT * FROM variants WHERE product_id = ? ${includeInactive ? "" : "AND active = 1"} ORDER BY position, id`,
    p.id,
  );
  return { ...p, images, variants };
}

export type QuickVariant = { id: number; color: string; hex: string; size: string; stock: number };
export function parseVariants(raw: string): QuickVariant[] {
  return raw
    ? raw.split(";").map((x) => {
        const [id, color, hex, size, stock] = x.split(":");
        return { id: +id, color, hex, size, stock: +stock };
      })
    : [];
}

/** Capa da categoria: foto do primeiro produto disponível (troca sozinha quando a loja sobe fotos reais). */
export async function categoryCovers(slugs: string[]) {
  const out: Record<string, { image: string | null; count: number }> = {};
  for (const slug of slugs) {
    const f = await categoryFilter(slug);
    const xf = f.sql.replace(/p\./g, "x.");
    const row = await get<{ image: string | null; n: number }>(
      `SELECT (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image,
              (SELECT COUNT(*) FROM products x WHERE ${VISIBLE.replace(/p\./g, "x.")} AND ${xf}) AS n
       FROM products p WHERE ${VISIBLE} AND ${f.sql}
       ORDER BY p.featured DESC, p.id DESC LIMIT 1`,
      ...f.ids,
      ...f.ids,
    );
    out[slug] = { image: row?.image ?? null, count: row?.n ?? 0 };
  }
  return out;
}
