import Link from "next/link";
import { categoryBySlug, categoryCovers, categoryTree, featuredProducts, queryProducts, type ProductCard as Card } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { effectivePrice, formatMoney } from "@/lib/util";
import { ProductCard } from "@/components/ProductCard";
import { HeroArt, PampasAccent } from "@/components/HeroArt";
import { Reveal } from "@/components/Reveal";

function Head({ title, text, href, cta }: { title: string; text?: string; href: string; cta: string }) {
  return (
    <div className="shead">
      <div>
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
      </div>
      <Link href={href} className="ulink">
        {cta}
      </Link>
    </div>
  );
}

export default async function Home() {
  const s = await getSettings();
  const cats = await categoryTree();
  const news = await featuredProducts(4, { onlyNew: true });
  const featured = await featuredProducts(5);
  const heroProduct: Card | undefined = (await featuredProducts(1))[0];
  const covers = await categoryCovers(cats.map((c) => c.slug));
  const bannerSlug = /categoria=([\w-]+)/.exec(s.banner_link)?.[1];
  const bannerCat = bannerSlug ? await categoryBySlug(bannerSlug) : undefined;
  const bannerImage = s.banner_image_url || (bannerSlug ? (await categoryCovers([bannerSlug]))[bannerSlug]?.image : null);
  const bannerDuo = !s.banner_image_url && bannerSlug ? await featuredProducts(2, { categorySlug: bannerSlug }) : [];
  const ig = s.instagram.replace("@", "");
  const igProducts = (await queryProducts({ pageSize: 6, sort: "novidades" })).items;
  const isDemo = [...news, ...featured].some((p) => p.is_demo);

  const benefits = [
    { t: "Envio para todo o Brasil", d: s.delivery_enabled === "1" ? s.delivery_note : "Consulte prazos e valores pelo WhatsApp.", i: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.6 1.6 0 100-.01M17 19a1.6 1.6 0 100-.01" },
    { t: "Pedido pelo WhatsApp", d: "Monte o carrinho no site e finalize a conversa direto com a loja. O pagamento é combinado com você.", i: "M4 20l1.3-4.2A8 8 0 118.4 18.8zM9 9.5c.5 2 2.5 4 5 5l1.5-1.2-1.8-1-.9.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.9-1-1.8z" },
    s.pickup_enabled === "1" ? { t: "Retirada na loja", d: s.pickup_note, i: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.400-6.500 11-6.500 11zM12 12a2.200 2.200 0 100-.01" } : null,
    s.hours || s.address ? { t: s.hours ? "Horário de atendimento" : "Onde estamos", d: s.hours || s.address, i: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z" } : null,
  ].filter((b): b is { t: string; d: string; i: string } => !!b);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1 className="hero-title">{s.hero_title}</h1>
            <p className="hero-sub">{s.hero_subtitle}</p>
            <div className="hero-cta">
              <Link href="/catalogo" className="btn btn-primary">
                Explorar a coleção
              </Link>
              <Link href="/catalogo?ordem=novidades" className="btn btn-outline">
                Ver novidades
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <span className="arch-outline" aria-hidden="true" />
            <div className="arch hero-arch">
              {s.hero_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.hero_image_url} alt={s.store_name} width={900} height={1200} fetchPriority="high" />
              ) : (
                <HeroArt />
              )}
            </div>
            <PampasAccent className="hero-pampas" />
            {heroProduct && (
              <Link href={`/produto/${heroProduct.slug}`} className="hero-card">
                {heroProduct.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroProduct.image} alt="" width={160} height={200} />
                )}
                <span>
                  <small>Em destaque</small>
                  <strong>{heroProduct.name}</strong>
                  <em>{formatMoney(effectivePrice(heroProduct))}</em>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {isDemo && <p className="demo-note">Catálogo de demonstração: produtos, preços e imagens são ilustrativos.</p>}

      <section className="sec container" aria-labelledby="cats-title">
        <Reveal>
          <div className="shead">
            <h2 id="cats-title">Compre por categoria</h2>
            <Link href="/catalogo" className="ulink">
              Todo o catálogo
            </Link>
          </div>
        </Reveal>
        <div className="cats">
          {cats.map((c, i) => (
            <Reveal key={c.id} variant="arch" delay={i * 110} className={`cat cat-${i % 3}`}>
              <Link href={`/catalogo?categoria=${c.slug}`} className="cat-link">
                <span className="arch cat-arch">
                  {covers[c.slug]?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={covers[c.slug].image!} alt="" loading="lazy" width={800} height={1000} />
                  ) : (
                    <HeroArt />
                  )}
                </span>
                <span className="cat-name">{c.name}</span>
                <span className="cat-count">
                  {covers[c.slug]?.count ?? 0} {(covers[c.slug]?.count ?? 0) === 1 ? "peça" : "peças"}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {news.length > 0 && (
        <section className="sec container">
          <Reveal>
            <Head title="Novidades" text="Peças que acabaram de chegar." href="/catalogo?ordem=novidades" cta="Ver todas as novidades" />
          </Reveal>
          <div className="pgrid">
            {news.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {bannerCat && (
        <section className="banner">
          <div className="container banner-grid">
            <Reveal className={`banner-img${s.banner_image_url ? "" : " duo"}`}>
              {s.banner_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.banner_image_url} alt="" loading="lazy" width={900} height={1000} />
              ) : bannerDuo.length > 0 ? (
                bannerDuo.map((p) => (
                  <Link key={p.id} href={`/produto/${p.slug}`} className="duo-item" aria-label={p.name}>
                    {p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" loading="lazy" width={600} height={750} />
                    )}
                  </Link>
                ))
              ) : (
                <HeroArt />
              )}
            </Reveal>
            <Reveal className="banner-copy" delay={120}>
              <h2>{s.banner_title}</h2>
              <p>{s.banner_text}</p>
              <Link href={s.banner_link} className="btn btn-light">
                Ver {bannerCat.name.toLowerCase()}
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="sec container">
          <Reveal>
            <Head title="Em destaque" text="Escolhidas pela loja." href="/catalogo" cta="Ver catálogo completo" />
          </Reveal>
          <div className="pgrid pgrid-feature">
            {featured.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} big={i === 0 && featured.length >= 5} />
            ))}
          </div>
        </section>
      )}

      <section className="benefits" aria-label="Como comprar">
        <div className="container benefits-grid">
          {benefits.map((b, i) => (
            <Reveal key={b.t} delay={i * 80} className="benefit">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={b.i} />
              </svg>
              <h3>{b.t}</h3>
              <p>{b.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {ig && (
        <section className="sec container insta">
          <Reveal>
            <div className="insta-head">
              <h2>Acompanhe no Instagram</h2>
              <p className="muted">Bastidores, lançamentos e novas peças em @{ig}.</p>
              <a className="btn btn-outline" href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">
                Seguir @{ig}
              </a>
            </div>
          </Reveal>
          {igProducts.length > 0 && (
            <div className="insta-strip" aria-label="Peças disponíveis no site">
              {igProducts.map((p) => (
                <Link key={p.id} href={`/produto/${p.slug}`} className="insta-tile" aria-label={p.name}>
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" loading="lazy" width={400} height={500} />
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
