import Link from "next/link";
import { parseVariants, type ProductCard as Card } from "@/lib/catalog";
import { effectivePrice, formatMoney } from "@/lib/util";
import { QuickAdd } from "./QuickAdd";
import type { CSSProperties } from "react";

export function ProductCard({ p, priority = false, index = 0, big = false }: { p: Card; priority?: boolean; index?: number; big?: boolean }) {
  const eff = effectivePrice(p);
  const onSale = eff < p.price_cents;
  const soldOut = p.total_stock <= 0;
  const variants = parseVariants(p.variants);
  const low = !soldOut && variants.every((v) => v.stock <= 3) && p.total_stock <= 3;
  const colors = p.colors ? p.colors.split(",").map((c) => c.split("|")) : [];
  const status = soldOut ? { t: "Esgotado", c: "dark" } : onSale ? { t: `−${Math.round((1 - eff / p.price_cents) * 100)}%`, c: "accent" } : p.is_new ? { t: "Novo", c: "" } : null;
  return (
    <article className={`pcard${big ? " pcard-big" : ""}${soldOut ? " is-out" : ""}`} style={{ "--i": index } as CSSProperties}>
      <div className="pcard-media">
        <Link href={`/produto/${p.slug}`} className="pcard-link" aria-label={p.name} tabIndex={-1}>
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} loading={priority ? "eager" : "lazy"} decoding="async" width={800} height={1000} />
          ) : (
            <span className="pcard-none">Foto em breve</span>
          )}
          {p.image2 && !soldOut && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="alt" src={p.image2} alt="" loading="lazy" decoding="async" width={800} height={1000} />
          )}
        </Link>
        <span className="pcard-badges">
          {status && <span className={`badge ${status.c}`}>{status.t}</span>}
          {p.is_demo ? <span className="badge ghost">Ilustrativo</span> : null}
        </span>
        {!soldOut && <QuickAdd variants={variants} name={p.name} />}
      </div>
      <div className="pcard-info">
        <h3>
          <Link href={`/produto/${p.slug}`}>{p.name}</Link>
        </h3>
        <p className="price">
          {onSale && <s>{formatMoney(p.price_cents)}</s>}
          <strong>{formatMoney(eff)}</strong>
        </p>
        <div className="pcard-meta">
          {colors.length > 0 && (
            <ul className="dots" aria-label="Cores">
              {colors.slice(0, 6).map(([n, hex]) => (
                <li key={n} title={n} style={{ background: hex }} />
              ))}
            </ul>
          )}
          {soldOut ? <span className="avail out">Indisponível</span> : low ? <span className="avail low">Últimas unidades</span> : null}
        </div>
      </div>
    </article>
  );
}
