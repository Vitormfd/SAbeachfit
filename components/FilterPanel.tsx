"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Envolve o formulário de filtros: aplica ao mudar (radios/selects) e vira gaveta no celular. */
export function FilterPanel({ children, activeCount, total }: { children: ReactNode; activeCount: number; total: number }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function apply() {
    const f = ref.current;
    if (!f) return;
    const p = new URLSearchParams();
    new FormData(f).forEach((v, k) => {
      const val = String(v).trim();
      if (val) p.set(k, val);
    });
    router.push(`/catalogo${p.size ? `?${p}` : ""}`, { scroll: false });
  }

  return (
    <>
      <button type="button" className="btn btn-outline filter-open" onClick={() => setOpen(true)}>
        Filtrar{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
      <div className="scrim" data-open={open ? "1" : "0"} onClick={() => setOpen(false)} />
      <form
        ref={ref}
        className="fpanel"
        data-open={open ? "1" : "0"}
        method="get"
        action="/catalogo"
        onChange={(e) => {
          const t = e.target as unknown as HTMLInputElement;
          if (t.type === "radio" || t.tagName === "SELECT") apply();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          apply();
          setOpen(false);
        }}
      >
        <div className="fpanel-head">
          <h2>Filtros</h2>
          <button type="button" className="ibtn" aria-label="Fechar filtros" onClick={() => setOpen(false)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="fpanel-body">{children}</div>
        <div className="fpanel-foot">
          <button className="btn btn-primary btn-block">Ver {total} {total === 1 ? "peça" : "peças"}</button>
        </div>
      </form>
    </>
  );
}

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <label className="sort">
      <span>Ordenar</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(window.location.search);
          if (e.target.value === "relevancia") p.delete("ordem");
          else p.set("ordem", e.target.value);
          p.delete("pagina");
          router.push(`/catalogo${p.size ? `?${p}` : ""}`, { scroll: false });
        }}
      >
        <option value="relevancia">Relevância</option>
        <option value="novidades">Novidades</option>
        <option value="menor-preco">Menor preço</option>
        <option value="maior-preco">Maior preço</option>
      </select>
    </label>
  );
}
