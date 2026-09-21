"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CartItem = { variantId: number; qty: number };
type Ctx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (variantId: number, qty: number, max: number) => { added: number };
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  toast: (msg: string, cartLink?: boolean) => void;
};

const KEY = "sa_cart_v1";
const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<{ text: string; link: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(raw)) setItems(raw.filter((i) => Number.isInteger(i?.variantId) && Number.isInteger(i?.qty) && i.qty > 0));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const toast = useCallback((msg: string, cartLink = false) => {
    setMessage({ text: msg, link: cartLink });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 4200);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.qty, 0),
      add(variantId, qty, max) {
        const current = items.find((i) => i.variantId === variantId)?.qty ?? 0;
        const next = Math.min(current + qty, max);
        setItems((prev) => (prev.some((i) => i.variantId === variantId) ? prev.map((i) => (i.variantId === variantId ? { ...i, qty: next } : i)) : [...prev, { variantId, qty: next }]));
        return { added: next - current };
      },
      setQty: (variantId, qty) => setItems((prev) => (qty <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)))),
      remove: (variantId) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)),
      clear: () => setItems([]),
      toast,
    }),
    [items, ready, toast],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="toast" role="status" aria-live="polite" data-show={message ? "1" : "0"}>
        <span>{message?.text}</span>
        {message?.link && <Link href="/carrinho">Ver carrinho</Link>}
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}

export type CartLine = {
  variantId: number; productName: string; slug: string; color: string; size: string; image: string | null;
  unitPriceCents: number; stock: number; available: boolean;
};

/** Busca preço/estoque atuais das variações do carrinho. */
export function useCartLines() {
  const { items, ready } = useCart();
  const [lines, setLines] = useState<Record<number, CartLine>>({});
  const [loading, setLoading] = useState(true);
  const key = items.map((i) => i.variantId).sort().join(",");

  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      setLines({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, qty: Math.min(i.qty, 99) })) }) })
      .then((r) => r.json())
      .then((d: { lines?: CartLine[] }) => {
        if (cancelled) return;
        setLines(Object.fromEntries((d.lines ?? []).map((l) => [l.variantId, l])));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const rows = items.map((i) => ({ ...i, line: lines[i.variantId] })).filter((r) => r.line || loading);
  const subtotal = rows.reduce((s, r) => s + (r.line ? r.line.unitPriceCents * r.qty : 0), 0);
  const problems = rows.filter((r) => r.line && (!r.line.available || r.qty > r.line.stock));
  return { rows, subtotal, loading, problems, lines };
}
