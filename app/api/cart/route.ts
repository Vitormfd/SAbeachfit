import { NextResponse } from "next/server";
import { z } from "zod";
import { all } from "@/lib/db";
import { effectivePrice } from "@/lib/util";

const schema = z.object({
  items: z.array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(99) })).max(50),
});

// Retorna dados ATUAIS (preço/estoque) das variações do carrinho. Somente leitura.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const ids = [...new Set(parsed.data.items.map((i) => i.variantId))];
  if (!ids.length) return NextResponse.json({ lines: [] });

  const rows = await all<{
    id: number; color: string; size: string; stock: number; v_active: number; product_id: number; name: string; slug: string;
    price_cents: number; promo_price_cents: number | null; p_active: number; archived: number; image: string | null;
  }>(
    `SELECT v.id, v.color, v.size, v.stock, v.active AS v_active, p.id AS product_id, p.name, p.slug, p.price_cents, p.promo_price_cents,
            p.active AS p_active, p.archived,
            (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image
     FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id IN (${ids.map(() => "?").join(",")})`,
    ...ids,
  );
  const lines = rows.map((r) => ({
    variantId: r.id,
    productName: r.name,
    slug: r.slug,
    color: r.color,
    size: r.size,
    image: r.image,
    unitPriceCents: effectivePrice(r),
    stock: r.stock,
    available: !!(r.v_active && r.p_active && !r.archived),
  }));
  return NextResponse.json({ lines }, { headers: { "Cache-Control": "no-store" } });
}
