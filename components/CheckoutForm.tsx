"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useCart, useCartLines } from "./cart";
import { formatMoney } from "@/lib/util";
import { quoteDelivery, type ShippingConfig } from "@/lib/shipping";

export function CheckoutForm({ cfg, pickupNote, deliveryNote }: { cfg: ShippingConfig; pickupNote: string; deliveryNote: string }) {
  const cart = useCart();
  const router = useRouter();
  const { rows, subtotal, loading, problems } = useCartLines();
  const [method, setMethod] = useState<"pickup" | "delivery">(cfg.pickupEnabled ? "pickup" : "delivery");
  const [city, setCity] = useState(cfg.localCity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Uma chave por tentativa de checkout: reenvios/cliques duplos não geram pedidos duplicados.
  const key = useRef<string>("");
  if (!key.current && typeof crypto !== "undefined") key.current = crypto.randomUUID();

  if (cart.ready && cart.items.length === 0) {
    return (
      <div className="empty">
        <span className="empty-arch" aria-hidden="true" />
        <h2>Seu carrinho está vazio</h2>
        <p>Escolha suas peças favoritas e elas aparecem aqui.</p>
        <Link href="/catalogo" className="btn btn-primary">Explorar a coleção</Link>
      </div>
    );
  }
  if (!cfg.pickupEnabled && !cfg.deliveryEnabled) {
    return <p className="notice warn">Os pedidos online estão temporariamente indisponíveis. Fale com a loja pelo WhatsApp.</p>;
  }

  const quote = quoteDelivery(cfg, method, city, subtotal);
  const total = subtotal + quote.feeCents;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const f = new FormData(e.currentTarget);
    const str = (n: string) => String(f.get(n) ?? "").trim();
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: key.current || crypto.randomUUID(),
          name: str("name"),
          phone: str("phone"),
          method,
          street: str("street"),
          number: str("number"),
          neighborhood: str("neighborhood"),
          city: str("city"),
          complement: str("complement"),
          notes: str("notes"),
          items: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "stock") cart.toast("Estoque atualizado — revise seu carrinho.");
        setError(data.error || "Erro ao enviar o pedido.");
        if (data.code === "stock") router.push("/carrinho");
        setBusy(false);
        return;
      }
      cart.clear();
      window.open(data.whatsappUrl, "_blank", "noopener");
      router.push(`/pedido/${data.token}`);
    } catch {
      setError("Sem conexão. Verifique sua internet e tente novamente.");
      setBusy(false);
    }
  }

  return (
    <form className="cart-layout" onSubmit={submit}>
      <div className="stack">
        <fieldset className="panel">
          <legend>Seus dados</legend>
          <label>
            Nome completo *
            <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
          </label>
          <label>
            WhatsApp / telefone (opcional)
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(75) 90000-0000" maxLength={30} />
          </label>
        </fieldset>

        <fieldset className="panel">
          <legend>Forma de recebimento</legend>
          <div className="choice">
            {cfg.pickupEnabled && (
              <label className="radio">
                <input type="radio" name="method" checked={method === "pickup"} onChange={() => setMethod("pickup")} />
                <span>
                  <strong>Retirada</strong>
                  <small>{pickupNote}</small>
                </span>
              </label>
            )}
            {cfg.deliveryEnabled && (
              <label className="radio">
                <input type="radio" name="method" checked={method === "delivery"} onChange={() => setMethod("delivery")} />
                <span>
                  <strong>Entrega</strong>
                  <small>{deliveryNote}</small>
                </span>
              </label>
            )}
          </div>
          {method === "delivery" && (
            <div className="form-grid">
              <label className="span2">
                Rua / avenida *
                <input name="street" required maxLength={160} autoComplete="address-line1" />
              </label>
              <label>
                Número *
                <input name="number" required maxLength={20} />
              </label>
              <label>
                Complemento
                <input name="complement" maxLength={120} />
              </label>
              <label>
                Bairro *
                <input name="neighborhood" required maxLength={80} />
              </label>
              <label>
                Cidade *
                <input name="city" required maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="panel">
          <legend>Observações</legend>
          <label>
            Algo que devemos saber? (opcional)
            <textarea name="notes" rows={3} maxLength={600} />
          </label>
        </fieldset>
      </div>

      <aside className="summary" aria-label="Resumo do pedido">
        <h2>Resumo</h2>
        <ul className="mini-list">
          {rows.map((r) =>
            r.line ? (
              <li key={r.variantId}>
                <span>
                  {r.qty}× {r.line.productName}
                  <small>
                    {r.line.color} / {r.line.size}
                  </small>
                </span>
                <span>{formatMoney(r.line.unitPriceCents * r.qty)}</span>
              </li>
            ) : null,
          )}
        </ul>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div>
            <dt>Entrega</dt>
            <dd>{quote.pending || quote.label ? quote.label : formatMoney(quote.feeCents)}</dd>
          </div>
          <div className="total">
            <dt>Total</dt>
            <dd>{formatMoney(total)}</dd>
          </div>
        </dl>
        {problems.length > 0 && (
          <p className="notice warn">
            Há itens indisponíveis. <Link href="/carrinho">Revisar carrinho</Link>
          </p>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy || loading || problems.length > 0}>
          {busy ? "Enviando…" : "Enviar pedido pelo WhatsApp"}
        </button>
        <p className="muted small">
          Ao enviar, seu pedido é registrado e o WhatsApp abre com a mensagem pronta. O pedido só é confirmado quando a loja responder — não há cobrança automática.
        </p>
      </aside>
    </form>
  );
}
