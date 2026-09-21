import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { all, get, run } from "./db";
import { newToken, sha256, verifyPassword, hashPassword } from "./password";

export const COOKIE = "sa_admin";
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export type Admin = { id: number; email: string; name: string; role: "owner" | "staff" };

async function clientKey(email: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "local").split(",")[0].trim();
  return `${ip}|${email.toLowerCase()}`;
}

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = await clientKey(email);
  const since = Date.now() - WINDOW_MS;
  await run("DELETE FROM login_attempts WHERE at < ?", since);
  const fails = (await get<{ n: number }>("SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at >= ?", key, since))!.n;
  if (fails >= MAX_FAILS) return { ok: false, error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };

  const row = await get<{ id: number; password_hash: string; active: number }>(
    "SELECT id, password_hash, active FROM admins WHERE email = ?",
    email.trim().toLowerCase(),
  );
  // Executa o hash mesmo sem usuário para não vazar existência por tempo de resposta.
  const valid = verifyPassword(password, row?.password_hash ?? "scrypt$16384$00$00") && !!row && row.active === 1;
  if (!valid || !row) {
    await run("INSERT INTO login_attempts (key, at) VALUES (?, ?)", key, Date.now());
    return { ok: false, error: "E-mail ou senha incorretos." };
  }
  await run("DELETE FROM login_attempts WHERE key = ?", key);

  const token = newToken();
  await run("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)", sha256(token), row.id, Date.now() + SESSION_DAYS * 86400_000);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", sha256(token));
  jar.delete(COOKIE);
}

export async function currentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await get<Admin & { expires_at: number }>(
    `SELECT a.id, a.email, a.name, a.role, s.expires_at FROM sessions s
     JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ? AND a.active = 1`,
    sha256(token),
  );
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** Toda página e ação administrativa DEVE chamar isto (o middleware é só a 1ª barreira). */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireOwner(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin?err=" + encodeURIComponent("Apenas a proprietária pode acessar esta área."));
  return admin;
}

export async function changePassword(adminId: number, newPassword: string) {
  await run("UPDATE admins SET password_hash = ? WHERE id = ?", hashPassword(newPassword), adminId);
  await run("DELETE FROM sessions WHERE admin_id = ?", adminId);
}

export async function listAdmins() {
  return all<{ id: number; email: string; name: string; role: string; active: number; created_at: string }>(
    "SELECT id, email, name, role, active, created_at FROM admins ORDER BY id",
  );
}

