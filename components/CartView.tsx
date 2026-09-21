"use client";
import Link from "next/link";
import { useCart, useCartLines } from "./cart";
import { formatMoney } from "@/lib/util";

export function CartView() {
  const cart = useCart();
  const { rows, subtotal, loading, problems } = useCartLines();

  if (cart.ready && cart.items.length === 0) {
    return (
      <div className="empty">
        <span className="empty-arch" aria-hidden="true" />
        <h2>Seu carrinho está vazio</h2>
        <p>Escolha suas peças favoritas e elas aparecem aqui.</p>
        <Link href="/catalogo" className="btn btn-primary">
          Explorar a coleção
        </Link>
      </div>
    );
  }

  function fixAll() {
    for (const r of problems) {
      if (!r.line) continue;
      if (!r.line.available || r.line.stock <= 0) cart.remove(r.variantId);
      else cart.setQty(r.variantId, r.line.stock);
    }
  }

  return (
    <div className="cart-layout">
      <div>
        {problems.length > 0 && (
          <div className="notice warn" role="alert">
            <p>Alguns itens mudaram de disponibilidade. Ajuste o carrinho para continuar.</p>
            <button className="btn btn-ghost" onClick={fixAll}>
              Ajustar automaticamente
            </button>
          </div>
        )}
        <ul className="cart-list">
          {rows.map((r) => {
            const l = r.line;
            if (!l) return <li key={r.variantId} className="cart-item skeleton" aria-busy="true" />;
            const bad = !l.available || r.qty > l.stock;
            return (
              <li key={r.variantId} className="cart-item" data-bad={bad ? "1" : "0"}>
                <Link href={`/produto/${l.slug}`} className="cart-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.image ? <img src={l.image} alt="" width={96} height={120} loading="lazy" /> : <span className="card-noimg" />}
                </Link>
                <div className="cart-info">
                  <Link href={`/produto/${l.slug}`} className="cart-name">
                    {l.productName}
                  </Link>
                  <p className="muted small">
                    Cor: {l.color} · Tamanho: {l.size}
                  </p>
                  <p className="price">{formatMoney(l.unitPriceCents)}</p>
                  {bad && <p className="field-error">{!l.available || l.stock <= 0 ? "Indisponível no momento." : `Apenas ${l.stock} em estoque.`}</p>}
                  <div className="cart-actions">
                    <div className="qty" role="group" aria-label={`Quantidade de ${l.productName}`}>
                      <button type="button" aria-label="Diminuir" onClick={() => cart.setQty(r.variantId, r.qty - 1)}>−</button>
                      <output>{r.qty}</output>
                      <button type="button" aria-label="Aumentar" disabled={r.qty >= l.stock} onClick={() => cart.setQty(r.variantId, r.qty + 1)}>+</button>
                    </div>
                    <button type="button" className="link-btn" onClick={() => cart.remove(r.variantId)}>
                      Remover
                    </button>
                  </div>
                </div>
                <p className="cart-line-total">{formatMoney(l.unitPriceCents * r.qty)}</p>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="summary" aria-label="Resumo do pedido">
        <h2>Resumo</h2>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{loading ? "…" : formatMoney(subtotal)}</dd>
          </div>
          <div>
            <dt>Entrega</dt>
            <dd className="muted">Calculada na finalização</dd>
          </div>
          <div className="total">
            <dt>Total</dt>
            <dd>{loading ? "…" : formatMoney(subtotal)}</dd>
          </div>
        </dl>
        {problems.length > 0 || loading ? (
          <button className="btn btn-primary btn-block" disabled>
            Finalizar pedido no WhatsApp
          </button>
        ) : (
          <Link href="/checkout" className="btn btn-primary btn-block">
            Finalizar pedido no WhatsApp
          </Link>
        )}
        <p className="muted small">Você revisará os dados antes de abrir o WhatsApp. O pagamento é combinado com a loja.</p>
      </aside>
    </div>
  );
}
