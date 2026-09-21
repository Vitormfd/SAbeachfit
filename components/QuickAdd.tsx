"use client";
import { useMemo, useState } from "react";
import { useCart } from "./cart";

export type QV = { id: number; color: string; hex: string; size: string; stock: number };
const ORDER = ["PP", "P", "M", "G", "GG", "XG", "Único"];
const cmp = (a: string, b: string) => {
  const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
  return ia >= 0 && ib >= 0 ? ia - ib : ia >= 0 ? -1 : ib >= 0 ? 1 : a.localeCompare(b, "pt-BR", { numeric: true });
};

/** Adição rápida no cartão: escolhe cor/tamanho e adiciona 1 unidade, respeitando o estoque. */
export function QuickAdd({ variants, name }: { variants: QV[]; name: string }) {
  const cart = useCart();
  const colors = useMemo(() => [...new Map(variants.filter((v) => v.stock > 0).map((v) => [v.color, v.hex])).entries()], [variants]);
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(colors[0]?.[0] ?? "");
  const [done, setDone] = useState(false);
  if (!colors.length) return null;

  const sizes = variants.filter((v) => v.color === color).sort((a, b) => cmp(a.size, b.size));

  function add(v: QV) {
    const inCart = cart.items.find((i) => i.variantId === v.id)?.qty ?? 0;
    if (inCart >= v.stock) return cart.toast("Você já tem todas as unidades disponíveis no carrinho.", true);
    cart.add(v.id, 1, v.stock);
    cart.toast(`${name} (${v.color}, ${v.size}) foi para o carrinho`, true);
    setDone(true);
    setOpen(false);
    setTimeout(() => setDone(false), 1600);
  }

  return (
    <div className="qa" data-open={open ? "1" : "0"}>
      <button type="button" className="qa-btn" data-done={done ? "1" : "0"} aria-expanded={open} onClick={() => setOpen(!open)}>
        {done ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            Adicionado
          </>
        ) : (
          <>
            <span className="qa-plus" aria-hidden="true">+</span>
            <span className="qa-label">Adicionar</span>
            <span className="sr">{name} ao carrinho</span>
          </>
        )}
      </button>
      <div className="qa-panel" role="group" aria-label={`Escolha cor e tamanho de ${name}`}>
        {colors.length > 1 && (
          <div className="qa-colors">
            {colors.map(([c, hex]) => (
              <button key={c} type="button" title={c} aria-label={c} aria-pressed={c === color} onClick={() => setColor(c)}>
                <span style={{ background: hex }} />
              </button>
            ))}
          </div>
        )}
        <div className="qa-sizes">
          {sizes.map((v) => (
            <button key={v.id} type="button" disabled={v.stock <= 0} onClick={() => add(v)} aria-label={`Tamanho ${v.size}${v.stock <= 0 ? ", esgotado" : ""}`}>
              {v.size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
