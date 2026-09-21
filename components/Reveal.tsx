"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Revela o conteúdo ao entrar na tela. Sem JS (ou com movimento reduzido) o conteúdo já aparece normalmente. */
export function Reveal({ children, className = "", variant = "rise", delay = 0 }: { children: ReactNode; className?: string; variant?: "rise" | "arch"; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return void el.setAttribute("data-in", "");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.setAttribute("data-in", "");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal reveal-${variant} ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
