"use server";
import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

export async function loginAction(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };
  const res = await login(email, password);
  if (!res.ok) return { error: res.error };
  redirect("/admin");
}
