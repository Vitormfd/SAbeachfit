import type { Metadata } from "next";
import "../admin.css";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar — Painel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  const s = await getSettings();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <Logo logoUrl={s.logo_url} name={s.store_name} />
        </div>
        <h1>Painel administrativo</h1>
        <LoginForm />
      </div>
    </div>
  );
}
