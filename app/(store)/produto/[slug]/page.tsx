import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productBySlug, relatedProducts } from "@/lib/catalog";
import { getSettings, siteUrl } from "@/lib/settings";
import { effectivePrice, formatMoney } from "@/lib/util";
import { ProductBuy, ProductGallery } from "@/components/ProductBuy";
import { ProductCard } from "@/components/ProductCard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await productBySlug(slug);
  if (!p) return { title: "Produto não encontrado" };
  const desc = p.description.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: p.name,
    description: desc || `${p.name} — ${(await getSettings()).store_name}`,
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { title: p.name, description: desc, images: p.images[0] ? [p.images[0].url] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await productBySlug(slug);
  if (!p) notFound();
  const s = await getSettings();
  const eff = effectivePrice(p);
  const onSale = eff < p.price_cents;
  const total = p.variants.reduce((n, v) => n + v.stock, 0);
  const related = await relatedProducts(p.id, p.category_id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => siteUrl() + i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (eff / 100).toFixed(2),
      availability: total > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl()}/produto/${p.slug}`,
    },
  };

  return (
    <div className="container page pdp">
      <nav className="crumbs" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/catalogo">Catálogo</Link>
        {p.category_slug && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/catalogo?categoria=${p.category_slug}`}>{p.category_name}</Link>
          </>
        )}
      </nav>

      <div className="product">
        <ProductGallery images={p.images} name={p.name} />
        <div className="product-info">
          {p.is_demo ? <p className="badge ghost">Imagens ilustrativas</p> : null}
          <h1>{p.name}</h1>
          <p className="price big">
            {onSale && <s>{formatMoney(p.price_cents)}</s>}
            <strong>{formatMoney(eff)}</strong>
            {onSale && <span className="badge accent">−{Math.round((1 - eff / p.price_cents) * 100)}%</span>}
          </p>
          <ProductBuy variants={p.variants.map(({ id, color, color_hex, size, stock }) => ({ id, color, color_hex, size, stock }))} lowThreshold={p.low_stock_threshold} />
          <div className="prose">
            <h2>Sobre a peça</h2>
            <p style={{ whiteSpace: "pre-line" }}>{p.description || "Sem descrição."}</p>
          </div>
          <p className="muted small">
            Pedido finalizado pelo WhatsApp. O pagamento é combinado diretamente com a loja. {s.delivery_note}
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="sec">
          <div className="shead">
            <h2>Você também pode gostar</h2>
          </div>
          <div className="pgrid">
            {related.map((r, i) => (
              <ProductCard key={r.id} p={r} index={i} />
            ))}
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
