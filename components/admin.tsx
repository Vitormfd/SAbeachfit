"use client";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export function SubmitButton({ children, className = "btn btn-primary", pending: label = "Salvando…", confirm }: { children: ReactNode; className?: string; pending?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? label : children}
    </button>
  );
}

/** Botão de submit que pede confirmação (funciona dentro de <form action={serverAction}>). */
export function ConfirmButton({ children, message, className = "btn btn-ghost", name, value }: { children: ReactNode; message: string; className?: string; name?: string; value?: string }) {
  return (
    <button className={className} name={name} value={value} formNoValidate onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}

export function AdminNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-shell" data-open={open ? "1" : "0"}>
      <button className="admin-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        ☰
      </button>
      <div onClick={() => setOpen(false)}>{children}</div>
    </div>
  );
}

/** Menu lateral: destaca a página atual (o item "Dashboard" só vale na rota exata). */
export function SideLinks({ links, pending }: { links: [string, string][]; pending: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label="Painel">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
          {label}
          {href === "/admin/pedidos" && pending > 0 && <em className="pill">{pending}</em>}
        </Link>
      ))}
      <Link href="/" target="_blank">Ver loja ↗</Link>
    </nav>
  );
}
