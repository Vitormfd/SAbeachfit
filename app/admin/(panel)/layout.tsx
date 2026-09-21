import "../admin.css";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { get } from "@/lib/db";
import { AdminNav, SideLinks } from "@/components/admin";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const s = await getSettings();
  const pending = (await get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE status = 'awaiting'"))!.n;
  const links = [
    ["/admin", "Dashboard"],
    ["/admin/pedidos", "Pedidos"],
    ["/admin/produtos", "Produtos"],
    ["/admin/estoque", "Estoque"],
    ["/admin/categorias", "Categorias"],
    ...(admin.role === "owner" ? [["/admin/configuracoes", "Configurações"], ["/admin/usuarios", "Usuários"]] : [["/admin/usuarios", "Minha senha"]]),
  ];
  return (
    <AdminNav>
      <aside className="admin-side">
        <div className="admin-brand">
          <strong>{s.store_name}</strong>
          <span>Painel</span>
        </div>
        <SideLinks links={links as [string, string][]} pending={pending} />
        <form action={logoutAction} className="admin-user">
          <span>{admin.name}</span>
          <button className="link-btn">Sair</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </AdminNav>
  );
}
