"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./cart";

type V = { id: number; color: string; color_hex: string; size: string; stock: number };
type Img = { id: number; url: string };

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "Único"];
const bySize = (a: string, b: string) => {
  const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
  return ia >= 0 && ib >= 0 ? ia - ib : ia >= 0 ? -1 : ib >= 0 ? 1 : a.localeCompare(b, "pt-BR", { numeric: true });
};

/** Celular: carrossel com deslize. Desktop: fotos empilhadas em grade editorial, com zoom ao passar o mouse. */
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!images.length) {
    return (
      <div className="pgal">
        <figure className="pgal-fig pgal-none">Foto em breve</figure>
      </div>
    );
  }
  const go = (n: number) => track.current?.scrollTo({ left: n * track.current.clientWidth, behavior: "smooth" });

  return (
    <div className="pgal-wrap">
      <div className="pgal" ref={track}>
        {images.map((im, n) => (
          <figure
            key={im.id}
            className="pgal-fig"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
              e.currentTarget.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.url} alt={`${name}, foto ${n + 1} de ${images.length}`} width={800} height={1000} loading={n === 0 ? "eager" : "lazy"} decoding="async" />
          </figure>
        ))}
      </div>
      {images.length > 1 && (
        <div className="pgal-dots" role="tablist" aria-label="Fotos do produto">
          {images.map((im, n) => (
            <button key={im.id} role="tab" aria-selected={n === i} aria-label={`Foto ${n + 1}`} onClick={() => go(n)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductBuy({ variants, lowThreshold }: { variants: V[]; lowThreshold: number }) {
  const cart = useCart();
  const colors = useMemo(() => {
    const m = new Map<string, string>();
    variants.forEach((v) => m.has(v.color) || m.set(v.color, v.color_hex));
    return [...m].map(([name, hex]) => ({ name, hex }));
  }, [variants]);
  const firstAvail = variants.find((v) => v.stock > 0);
  const [color, setColor] = useState(firstAvail?.color ?? colors[0]?.name ?? "");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const sizesForColor = useMemo(() => variants.filter((v) => v.color === color).sort((a, b) => bySize(a.size, b.size)), [variants, color]);
  const selected = variants.find((v) => v.color === color && v.size === size);
  const inCart = selected ? (cart.items.find((i) => i.variantId === selected.id)?.qty ?? 0) : 0;
  const remaining = selected ? Math.max(0, selected.stock - inCart) : 0;
  const allOut = variants.every((v) => v.stock <= 0);

  function pickColor(c: string) {
    setColor(c);
    setError("");
    setQty(1);
    if (!variants.find((v) => v.color === c && v.size === size && v.stock > 0)) setSize("");
  }

  function add() {
    if (!selected) return setError("Escolha um tamanho para continuar.");
    if (remaining <= 0) return setError(selected.stock <= 0 ? "Este tamanho está esgotado." : "Você já tem todas as unidades disponíveis no carrinho.");
    const { added } = cart.add(selected.id, Math.min(qty, remaining), selected.stock);
    setError("");
    setQty(1);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
    cart.toast(added ? `${added} ${added === 1 ? "unidade adicionada" : "unidades adicionadas"} ao carrinho` : "Quantidade máxima já está no carrinho", true);
  }

  if (allOut) {
    return (
      <div className="buy">
        <p className="notice">Esta peça está esgotada no momento. Fale com a loja no WhatsApp para saber sobre reposição.</p>
      </div>
    );
  }

  const availability = !selected
    ? "Escolha o tamanho para ver a disponibilidade."
    : selected.stock <= 0
      ? "Esgotado neste tamanho."
      : selected.stock <= lowThreshold
        ? `Últimas ${selected.stock} unidades neste tamanho.`
        : "Disponível.";

  return (
    <div className="buy">
      <fieldset className="opt">
        <legend>
          Cor <strong>{color}</strong>
        </legend>
        <div className="swatches">
          {colors.map((c) => {
            const out = variants.filter((v) => v.color === c.name).every((v) => v.stock <= 0);
            return (
              <button key={c.name} type="button" className="swatch" aria-pressed={c.name === color} aria-label={`${c.name}${out ? " (esgotada)" : ""}`} title={c.name} data-out={out ? "1" : "0"} onClick={() => pickColor(c.name)}>
                <span style={{ background: c.hex }} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="opt">
        <legend>
          Tamanho {size && <strong>{size}</strong>}
        </legend>
        <div className="sizes">
          {sizesForColor.map((v) => (
            <button key={v.id} type="button" className="size" aria-pressed={v.size === size} disabled={v.stock <= 0} title={v.stock <= 0 ? "Esgotado" : undefined} onClick={() => (setSize(v.size), setError(""), setQty(1))}>
              {v.size}
            </button>
          ))}
        </div>
      </fieldset>

      <p className={`availability${selected && selected.stock > 0 && selected.stock <= lowThreshold ? " low" : ""}`} aria-live="polite">
        {availability}
        {selected && inCart > 0 && <span> Você já tem {inCart} no carrinho.</span>}
      </p>

      <div className="buy-row">
        <div className="qty" role="group" aria-label="Quantidade">
          <button type="button" aria-label="Diminuir quantidade" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>−</button>
          <output aria-live="polite">{qty}</output>
          <button type="button" aria-label="Aumentar quantidade" onClick={() => setQty(Math.min(Math.max(remaining, 1), qty + 1))} disabled={!selected || qty >= remaining}>+</button>
        </div>
        <button type="button" className="btn btn-primary btn-block" data-done={done ? "1" : "0"} onClick={add}>
          {done ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
        </button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {inCart > 0 && <Link href="/carrinho" className="ulink">Ir para o carrinho</Link>}
    </div>
  );
}
