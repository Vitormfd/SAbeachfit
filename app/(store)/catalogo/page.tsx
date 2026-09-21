import Link from "next/link";
import type { Metadata } from "next";
import { categoryBySlug, categoryTree, facets, queryProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { parseMoney } from "@/lib/util";
import { ProductCard } from "@/components/ProductCard";
import { FilterPanel, SortSelect } from "@/components/FilterPanel";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = one(sp.categoria) ? await categoryBySlug(one(sp.categoria)) : undefined;
  return {
    title: cat ? cat.name : "Catálogo",
    description: cat ? `Confira ${cat.name.toLowerCase()} da ${(await getSettings()).store_name}.` : "Roupas femininas, moda fitness e pijamas. Filtre por tamanho, cor e preço.",
    alternates: { canonical: cat ? `/catalogo?categoria=${cat.slug}` : "/catalogo" },
  };
}

export default async function Catalogo({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const category = one(sp.categoria);
  const size = one(sp.tamanho);
  const color = one(sp.cor);
  const minRaw = one(sp.min);
  const maxRaw = one(sp.max);
  const sort = (["relevancia", "novidades", "menor-preco", "maior-preco"].includes(one(sp.ordem)) ? one(sp.ordem) : "relevancia") as "relevancia";
  const page = parseInt(one(sp.pagina)) || 1;
  const q = one(sp.q).slice(0, 60);

  const result = await queryProducts({
    category: category || undefined,
    size: size || undefined,
    color: color || undefined,
    min: minRaw ? (parseMoney(minRaw) ?? undefined) : undefined,
    max: maxRaw ? (parseMoney(maxRaw) ?? undefined) : undefined,
    sort,
    page,
    q: q || undefined,
    pageSize: parseInt(s.page_size) || 12,
    showOutOfStock: s.show_out_of_stock === "1",
  });
  const { sizes, colors } = await facets();
  const tree = await categoryTree();
  const activeCat = category ? await categoryBySlug(category) : undefined;
  const parentOfActive = activeCat?.parent_id ? tree.find((c) => c.id === activeCat.parent_id) : undefined;
  const subs = (parentOfActive ?? tree.find((c) => c.id === activeCat?.id))?.children ?? [];

  const base: Record<string, string> = { categoria: category, tamanho: size, cor: color, min: minRaw, max: maxRaw, ordem: sort === "relevancia" ? "" : sort, q };
  const hrefWith = (over: Record<string, string>, pageN = 1) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...base, ...over })) if (v) p.set(k, v);
    if (pageN > 1) p.set("pagina", String(pageN));
    const qs = p.toString();
    return `/catalogo${qs ? `?${qs}` : ""}`;
  };
  const chips = [
    activeCat && { label: activeCat.name, href: hrefWith({ categoria: "" }) },
    size && { label: `Tamanho ${size}`, href: hrefWith({ tamanho: "" }) },
    color && { label: color, href: hrefWith({ cor: "" }) },
    (minRaw || maxRaw) && { label: `R$ ${minRaw || "0"} a ${maxRaw || "…"}`, href: hrefWith({ min: "", max: "" }) },
    q && { label: `“${q}”`, href: hrefWith({ q: "" }) },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="container page">
      <header className="cat-head">
        <nav className="crumbs" aria-label="Você está em">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          {activeCat && parentOfActive ? (
            <>
              <Link href={`/catalogo?categoria=${parentOfActive.slug}`}>{parentOfActive.name}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{activeCat.name}</span>
            </>
          ) : (
            <span aria-current="page">{activeCat ? activeCat.name : "Catálogo"}</span>
          )}
        </nav>
        <h1>{q ? `Resultados para “${q}”` : activeCat ? activeCat.name : "Catálogo"}</h1>
        {subs.length > 0 && (
          <div className="subcats">
            <Link href={hrefWith({ categoria: (parentOfActive ?? activeCat)!.slug })} aria-current={activeCat && !parentOfActive ? "true" : undefined}>
              Tudo
            </Link>
            {subs.map((c) => (
              <Link key={c.id} href={hrefWith({ categoria: c.slug })} aria-current={c.slug === category ? "true" : undefined}>
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="cat-layout">
        <aside className="cat-side">
          <FilterPanel activeCount={chips.length} total={result.total}>
            <fieldset className="f-group">
              <legend>Categoria</legend>
              <label className="f-row"><input type="radio" name="categoria" value="" defaultChecked={!category} /><span>Todas</span></label>
              {tree.map((c) => (
                <div key={c.id}>
                  <label className="f-row"><input type="radio" name="categoria" value={c.slug} defaultChecked={category === c.slug} /><span>{c.name}</span></label>
                  {c.children.map((ch) => (
                    <label key={ch.id} className="f-row f-sub"><input type="radio" name="categoria" value={ch.slug} defaultChecked={category === ch.slug} /><span>{ch.name}</span></label>
                  ))}
                </div>
              ))}
            </fieldset>
            <fieldset className="f-group">
              <legend>Tamanho</legend>
              <div className="f-chips">
                <label className="f-chip"><input type="radio" name="tamanho" value="" defaultChecked={!size} /><span>Todos</span></label>
                {sizes.map((z) => (
                  <label key={z} className="f-chip"><input type="radio" name="tamanho" value={z} defaultChecked={size === z} /><span>{z}</span></label>
                ))}
              </div>
            </fieldset>
            <fieldset className="f-group">
              <legend>Cor</legend>
              <div className="f-swatches">
                <label className="f-sw" title="Todas as cores"><input type="radio" name="cor" value="" defaultChecked={!color} /><span className="all">Todas</span></label>
                {colors.map((c) => (
                  <label key={c.color} className="f-sw" title={c.color}>
                    <input type="radio" name="cor" value={c.color} defaultChecked={color === c.color} aria-label={c.color} />
                    <span style={{ background: c.color_hex }} />
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="f-group">
              <legend>Preço (R$)</legend>
              <div className="f-price">
                <input name="min" inputMode="decimal" placeholder="De" defaultValue={minRaw} aria-label="Preço mínimo" />
                <input name="max" inputMode="decimal" placeholder="Até" defaultValue={maxRaw} aria-label="Preço máximo" />
              </div>
              <button className="btn btn-outline btn-sm" type="submit">Aplicar preço</button>
            </fieldset>
            <input type="hidden" name="ordem" value={sort === "relevancia" ? "" : sort} />
            <input type="hidden" name="q" value={q} />
          </FilterPanel>
        </aside>

        <section aria-label="Produtos">
          <div className="cat-bar">
            <p aria-live="polite">
              {result.total} {result.total === 1 ? "peça" : "peças"}
            </p>
            <SortSelect value={sort} />
          </div>
          {chips.length > 0 && (
            <div className="chips-active">
              {chips.map((c) => (
                <Link key={c.label} href={c.href} className="fchip" aria-label={`Remover filtro ${c.label}`}>
                  {c.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </Link>
              ))}
              <Link href="/catalogo" className="ulink">Limpar tudo</Link>
            </div>
          )}

          {result.items.length === 0 ? (
            <div className="empty">
              <span className="empty-arch" aria-hidden="true" />
              <h2>Nada por aqui com esses filtros</h2>
              <p>Tente remover algum filtro ou buscar por outro termo.</p>
              <Link href="/catalogo" className="btn btn-primary">Ver todas as peças</Link>
            </div>
          ) : (
            <div className="pgrid pgrid-cat" key={JSON.stringify(base) + page}>
              {result.items.map((p, i) => (
                <ProductCard key={p.id} p={p} priority={i < 4} index={i} />
              ))}
            </div>
          )}

          {result.pages > 1 && (
            <nav className="pager" aria-label="Paginação">
              {result.page > 1 && <Link href={hrefWith({}, result.page - 1)}>Anterior</Link>}
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={hrefWith({}, n)} aria-current={n === result.page ? "page" : undefined}>
                  {n}
                </Link>
              ))}
              {result.page < result.pages && <Link href={hrefWith({}, result.page + 1)}>Próxima</Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
