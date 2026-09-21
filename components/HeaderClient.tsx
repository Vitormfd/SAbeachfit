"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./cart";
import { Logo } from "./Logo";

type Cat = { name: string; slug: string; children: { name: string; slug: string }[] };

export function HeaderClient({ name, logoUrl, cats, announce }: { name: string; logoUrl: string; cats: Cat[]; announce: string[] }) {
  const path = usePathname();
  const router = useRouter();
  const { count, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setMenu(false);
    setSearch(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setMenu(false), setSearch(false));
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  useEffect(() => {
    if (search) searchInput.current?.focus();
  }, [search]);

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) router.push(`/catalogo?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="hdr" data-scrolled={scrolled ? "1" : "0"}>
      <div className="announce" aria-label="Avisos da loja">
        <div className="container announce-row">
          {announce.map((t, i) => (
            <span key={i} className={i === 0 ? "" : "announce-extra"}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="container hdr-row">
        <div className="hdr-left">
          <button className="ibtn burger" aria-label="Abrir menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 8h16M4 16h10" />
            </svg>
          </button>
          <nav className="dnav" aria-label="Categorias">
            {cats.map((c) => (
              <div key={c.slug} className="dnav-item">
                <Link href={`/catalogo?categoria=${c.slug}`}>{c.name}</Link>
                {c.children.length > 0 && (
                  <div className="dnav-sub">
                    <Link href={`/catalogo?categoria=${c.slug}`}>Ver tudo</Link>
                    {c.children.map((ch) => (
                      <Link key={ch.slug} href={`/catalogo?categoria=${ch.slug}`}>
                        {ch.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link href="/catalogo?ordem=novidades">Novidades</Link>
          </nav>
        </div>

        <Link href="/" className="brand" aria-label={`${name} — página inicial`}>
          <Logo logoUrl={logoUrl} name={name} />
        </Link>

        <div className="hdr-right">
          <button className="ibtn" aria-label="Buscar produtos" aria-expanded={search} onClick={() => setSearch(!search)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </button>
          <Link href="/carrinho" className="ibtn cart" aria-label={`Carrinho, ${ready ? count : 0} ${count === 1 ? "item" : "itens"}`}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 8.5h13l-1 11.5h-11z" />
              <path d="M9 8.5V7a3 3 0 016 0v1.5" />
            </svg>
            {ready && count > 0 && (
              <span key={count} className="cart-dot">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="searchbar" data-open={search ? "1" : "0"}>
        <form className="container" role="search" onSubmit={submitSearch}>
          <input ref={searchInput} name="q" type="search" placeholder="O que você procura? Ex.: legging, pijama, vestido" aria-label="Buscar produtos" maxLength={60} tabIndex={search ? 0 : -1} />
          <button className="btn btn-primary" tabIndex={search ? 0 : -1}>
            Buscar
          </button>
        </form>
      </div>

      <div className="scrim" data-open={menu ? "1" : "0"} onClick={() => setMenu(false)} />
      <aside className="drawer" data-open={menu ? "1" : "0"} aria-hidden={!menu} aria-label="Menu">
        <div className="drawer-head">
          <Logo logoUrl={logoUrl} name={name} />
          <button className="ibtn" aria-label="Fechar menu" onClick={() => setMenu(false)} tabIndex={menu ? 0 : -1}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="drawer-nav">
          {cats.map((c, i) => (
            <div key={c.slug} className="drawer-group" style={{ "--i": i } as React.CSSProperties}>
              <Link href={`/catalogo?categoria=${c.slug}`} tabIndex={menu ? 0 : -1}>
                {c.name}
              </Link>
              <div>
                {c.children.map((ch) => (
                  <Link key={ch.slug} href={`/catalogo?categoria=${ch.slug}`} tabIndex={menu ? 0 : -1}>
                    {ch.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="drawer-group" style={{ "--i": cats.length } as React.CSSProperties}>
            <Link href="/catalogo?ordem=novidades" tabIndex={menu ? 0 : -1}>
              Novidades
            </Link>
          </div>
          <div className="drawer-group" style={{ "--i": cats.length + 1 } as React.CSSProperties}>
            <Link href="/catalogo" tabIndex={menu ? 0 : -1}>
              Todo o catálogo
            </Link>
          </div>
        </nav>
      </aside>
    </header>
  );
}
