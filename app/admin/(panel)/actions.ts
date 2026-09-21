"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { all, get, insert, run, tx } from "@/lib/db";
import { changePassword, logout, requireAdmin, requireOwner } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { saveSettings } from "@/lib/settings";
import { moveStock, manualMovement, StockError } from "@/lib/stock";
import { OrderError, saveAdminNotes, setPaymentStatus, updateOrderStatus } from "@/lib/orders";
import { parseMoney, slugify } from "@/lib/util";
import { SETTINGS_DEFAULTS } from "@/lib/settings-defaults";

const go = (path: string, kind: "ok" | "err", msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => (f.get(k) ? 1 : 0);
const int = (f: FormData, k: string) => parseInt(str(f, k), 10);

function refresh() {
  revalidatePath("/", "layout");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

/* ───────── Categorias ───────── */

export async function saveCategory(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const name = str(form, "name");
  const parent = int(form, "parent_id") || null;
  if (name.length < 2) return go("/admin/categorias", "err", "Informe o nome da categoria.");
  if (id && parent === id) return go("/admin/categorias", "err", "Uma categoria não pode ser subcategoria de si mesma.");
  if (parent) {
    const p = await get<{ parent_id: number | null }>("SELECT parent_id FROM categories WHERE id = ?", parent);
    if (p?.parent_id) return go("/admin/categorias", "err", "Use no máximo dois níveis (categoria > subcategoria).");
    if (id && (await get("SELECT 1 FROM categories WHERE parent_id = ?", id))) return go("/admin/categorias", "err", "Esta categoria possui subcategorias e não pode virar subcategoria.");
  }
  let failed = false;
  try {
    if (id) {
      await run("UPDATE categories SET name = ?, parent_id = ?, active = ? WHERE id = ?", name, parent, bool(form, "active"), id);
    } else {
      let slug = slugify(name) || "categoria";
      for (let n = 2; await get("SELECT 1 FROM categories WHERE slug = ?", slug); n++) slug = `${slugify(name)}-${n}`;
      const pos = (await get<{ n: number }>("SELECT COALESCE(MAX(position), -1) + 1 AS n FROM categories WHERE parent_id IS NOT DISTINCT FROM ?::int", parent))!.n;
      await run("INSERT INTO categories (name, slug, parent_id, position, active) VALUES (?, ?, ?, ?, 1)", name, slug, parent, pos);
    }
  } catch {
    failed = true;
  }
  if (failed) return go("/admin/categorias", "err", "Não foi possível salvar a categoria.");
  refresh();
  go("/admin/categorias", "ok", "Categoria salva.");
}

export async function moveCategory(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const cat = await get<{ id: number; parent_id: number | null }>("SELECT id, parent_id FROM categories WHERE id = ?", id);
  if (cat) {
    const siblings = await all<{ id: number }>("SELECT id FROM categories WHERE parent_id IS NOT DISTINCT FROM ?::int ORDER BY position, id", cat.parent_id);
    const i = siblings.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i >= 0 && j >= 0 && j < siblings.length) {
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      await tx(async () => {
        for (const [pos, s] of siblings.entries()) await run("UPDATE categories SET position = ? WHERE id = ?", pos, s.id);
      });
    }
  }
  refresh();
  redirect("/admin/categorias");
}

export async function deleteCategory(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  await tx(async () => {
    await run("UPDATE categories SET parent_id = NULL WHERE parent_id = ?", id); // subcategorias sobem de nível
    await run("DELETE FROM categories WHERE id = ?", id); // produtos ficam sem categoria (ON DELETE SET NULL)
  });
  refresh();
  go("/admin/categorias", "ok", "Categoria excluída. Os produtos dela ficaram sem categoria.");
}

/* ───────── Produtos ───────── */

const variantSchema = z.object({
  color: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  size: z.string().trim().min(1).max(12),
  stock: z.number().int().min(0).max(100000),
});
const urlSchema = z.string().regex(/^\/(media|demo)\/[a-zA-Z0-9._-]+$/);

export type ProductState = { error?: string };

export async function saveProduct(_prev: ProductState | undefined, form: FormData): Promise<ProductState> {
  const admin = await requireAdmin();
  const id = int(form, "id") || 0;
  const name = str(form, "name");
  if (name.length < 2) return { error: "Informe o nome do produto." };
  const price = parseMoney(str(form, "price"));
  if (price == null || price <= 0) return { error: "Informe um preço válido (ex.: 149,90)." };
  const promoRaw = str(form, "promo");
  const promo = promoRaw ? parseMoney(promoRaw) : null;
  if (promoRaw && (promo == null || promo >= price)) return { error: "O preço promocional deve ser menor que o preço normal." };
  const threshold = Math.max(0, int(form, "threshold") || 0);

  let variants: z.infer<typeof variantSchema>[];
  let images: string[];
  try {
    variants = z.array(variantSchema).parse(JSON.parse(str(form, "variants") || "[]"));
    images = z.array(urlSchema).max(12).parse(JSON.parse(str(form, "images") || "[]"));
  } catch {
    return { error: "Dados de variações/imagens inválidos. Revise cores, tamanhos e estoques." };
  }
  if (!variants.length) return { error: "Cadastre ao menos uma variação (cor + tamanho) com estoque." };
  const seen = new Set<string>();
  for (const v of variants) {
    const k = `${v.color.toLowerCase()}|${v.size.toLowerCase()}`;
    if (seen.has(k)) return { error: `Variação duplicada: ${v.color} / ${v.size}.` };
    seen.add(k);
  }
  const categoryId = int(form, "category_id") || null;

  try {
    await tx(async () => {
      let savedId = id;
      if (id) {
        await run(
          `UPDATE products SET name=?, description=?, price_cents=?, promo_price_cents=?, category_id=?, active=?, featured=?, is_new=?,
           low_stock_threshold=?, updated_at=now() WHERE id=?`,
          name, str(form, "description"), price, promo, categoryId, bool(form, "active"), bool(form, "featured"), bool(form, "is_new"), threshold, id,
        );
      } else {
        let slug = slugify(name) || "produto";
        const base = slug;
        for (let n = 2; await get("SELECT 1 FROM products WHERE slug = ?", slug); n++) slug = `${base}-${n}`;
        savedId = await insert(
          `INSERT INTO products (slug, name, description, price_cents, promo_price_cents, category_id, active, featured, is_new, low_stock_threshold)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          slug, name, str(form, "description"), price, promo, categoryId, bool(form, "active"), bool(form, "featured"), bool(form, "is_new"), threshold,
        );
      }

      await run("DELETE FROM product_images WHERE product_id = ?", savedId);
      for (const [i, url] of images.entries()) await run("INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)", savedId, url, i);

      // Reconciliação das variações: o estoque só muda via movimentação registrada.
      const existing = await all<{ id: number; color: string; size: string; stock: number }>("SELECT id, color, size, stock FROM variants WHERE product_id = ? FOR UPDATE", savedId);
      const keep = new Set<number>();
      for (const [pos, v] of variants.entries()) {
        const found = existing.find((e) => e.color.toLowerCase() === v.color.toLowerCase() && e.size.toLowerCase() === v.size.toLowerCase());
        if (found) {
          keep.add(found.id);
          await run("UPDATE variants SET color = ?, size = ?, color_hex = ?, position = ?, active = 1 WHERE id = ?", v.color, v.size, v.hex, pos, found.id);
          if (v.stock !== found.stock) {
            await moveStock({ variantId: found.id, delta: v.stock - found.stock, type: "ajuste", reason: "Edição do produto", adminId: admin.id });
          }
        } else {
          const vid = await insert("INSERT INTO variants (product_id, color, color_hex, size, stock, position) VALUES (?, ?, ?, ?, 0, ?)", savedId, v.color, v.hex, v.size, pos);
          if (v.stock > 0) await moveStock({ variantId: vid, delta: v.stock, type: "inicial", reason: "Cadastro da variação", adminId: admin.id });
          keep.add(vid);
        }
      }
      for (const e of existing) {
        if (keep.has(e.id)) continue;
        if (await get("SELECT 1 FROM order_items WHERE variant_id = ?", e.id)) await run("UPDATE variants SET active = 0 WHERE id = ?", e.id);
        else await run("DELETE FROM variants WHERE id = ?", e.id);
      }
    });
  } catch (e) {
    if (e instanceof StockError) return { error: e.message };
    console.error("[saveProduct]", e);
    return { error: "Não foi possível salvar o produto." };
  }
  refresh();
  go("/admin/produtos", "ok", "Produto salvo.");
  return {};
}

export async function productAction(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const op = str(form, "op");
  if (op === "toggle") await run("UPDATE products SET active = 1 - active, updated_at = now() WHERE id = ?", id);
  else if (op === "archive") await run("UPDATE products SET archived = 1, active = 0, updated_at = now() WHERE id = ?", id);
  else if (op === "restore") await run("UPDATE products SET archived = 0, updated_at = now() WHERE id = ?", id);
  else if (op === "delete") {
    if (await get("SELECT 1 FROM order_items WHERE product_id = ?", id)) {
      await run("UPDATE products SET archived = 1, active = 0 WHERE id = ?", id);
      refresh();
      return go("/admin/produtos", "ok", "O produto possui pedidos e foi arquivado (não pode ser excluído definitivamente).");
    }
    await run("DELETE FROM products WHERE id = ?", id);
    refresh();
    return go("/admin/produtos", "ok", "Produto excluído.");
  }
  refresh();
  go("/admin/produtos", "ok", "Produto atualizado.");
}

export async function deleteDemoData() {
  await requireOwner();
  await tx(async () => {
    await run("UPDATE products SET archived = 1, active = 0 WHERE is_demo = 1 AND id IN (SELECT product_id FROM order_items WHERE product_id IS NOT NULL)");
    await run("DELETE FROM products WHERE is_demo = 1 AND id NOT IN (SELECT product_id FROM order_items WHERE product_id IS NOT NULL)");
  });
  refresh();
  go("/admin/produtos", "ok", "Produtos de demonstração removidos.");
}

/* ───────── Estoque ───────── */

export async function stockMovementAction(form: FormData) {
  const admin = await requireAdmin();
  const variantId = int(form, "variant_id");
  const kind = str(form, "kind");
  const qty = int(form, "qty");
  const reason = str(form, "reason");
  const back = str(form, "back") || "/admin/estoque";
  if (!/^\/admin\/estoque/.test(back)) return go("/admin/estoque", "err", "Retorno inválido.");
  if (!["entrada", "saida", "ajuste"].includes(kind)) return go(back, "err", "Tipo de movimentação inválido.");
  if (!Number.isInteger(qty) || qty < 0 || qty > 100000 || (kind !== "ajuste" && qty === 0)) return go(back, "err", "Informe uma quantidade válida.");
  if (!reason) return go(back, "err", "Informe o motivo da movimentação.");
  let error = "";
  try {
    await manualMovement({ variantId, kind: kind as "entrada", qty, reason, adminId: admin.id });
  } catch (e) {
    error = e instanceof StockError ? e.message : "Erro ao movimentar estoque.";
  }
  if (error) return go(back, "err", error);
  refresh();
  go(back, "ok", "Estoque atualizado.");
}

/* ───────── Pedidos ───────── */

export async function orderUpdateAction(form: FormData) {
  const admin = await requireAdmin();
  const id = int(form, "id");
  const back = `/admin/pedidos/${id}`;
  const op = str(form, "op");
  let error = "";
  try {
    if (op === "status") await updateOrderStatus(id, str(form, "status"), admin.id, str(form, "note"));
    else if (op === "payment") {
      const p = str(form, "payment");
      if (!["unpaid", "paid", "refunded"].includes(p)) return go(back, "err", "Valor inválido.");
      await setPaymentStatus(id, p as "paid", admin.id);
    } else if (op === "notes") await saveAdminNotes(id, str(form, "admin_notes").slice(0, 2000), admin.id);
  } catch (e) {
    error = e instanceof OrderError ? e.message : "Não foi possível atualizar o pedido.";
  }
  if (error) return go(back, "err", error);
  go(back, "ok", "Pedido atualizado.");
}

/* ───────── Configurações ───────── */

export async function saveSettingsAction(form: FormData) {
  await requireOwner();
  const v: Record<string, string> = {};
  for (const k of Object.keys(SETTINGS_DEFAULTS)) {
    if (form.has(k)) v[k] = str(form, k);
  }
  for (const k of ["pickup_enabled", "delivery_enabled", "show_out_of_stock"]) v[k] = form.get(k) ? "1" : "0";
  const fee = parseMoney(str(form, "delivery_fee"));
  const free = str(form, "free_delivery_above") ? parseMoney(str(form, "free_delivery_above")) : 0;
  if (fee == null || free == null) return go("/admin/configuracoes", "err", "Valores de frete inválidos.");
  v.delivery_fee_cents = String(fee);
  v.free_delivery_above_cents = String(free);
  const digits = (v.whatsapp ?? "").replace(/\D/g, "");
  if (digits.length < 12) return go("/admin/configuracoes", "err", "WhatsApp inválido. Use o formato internacional: 55 + DDD + número.");
  v.whatsapp = digits;
  if (!v.store_name) return go("/admin/configuracoes", "err", "Informe o nome da loja.");
  for (const k of ["logo_url", "hero_image_url", "banner_image_url"]) {
    if (v[k] && !/^\/(media|demo)\/[a-zA-Z0-9._-]+$/.test(v[k])) v[k] = "";
  }
  if (v.banner_link && !/^\/[a-zA-Z0-9\/?=&_%.-]*$/.test(v.banner_link)) v.banner_link = "/catalogo";
  v.page_size = String(Math.min(48, Math.max(4, parseInt(v.page_size) || 12)));
  v.default_low_stock = String(Math.max(0, parseInt(v.default_low_stock) || 2));
  if (!v.whatsapp_template?.includes("{itens}")) return go("/admin/configuracoes", "err", "O modelo da mensagem precisa conter {itens}.");
  await saveSettings(v);
  refresh();
  go("/admin/configuracoes", "ok", "Configurações salvas.");
}

/* ───────── Usuários ───────── */

export async function createAdminAction(form: FormData) {
  await requireOwner();
  const email = str(form, "email").toLowerCase();
  const name = str(form, "name");
  const pw = String(form.get("password") ?? "");
  const role = str(form, "role") === "owner" ? "owner" : "staff";
  if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2) return go("/admin/usuarios", "err", "Informe nome e e-mail válidos.");
  if (pw.length < 8) return go("/admin/usuarios", "err", "A senha deve ter ao menos 8 caracteres.");
  if (await get("SELECT 1 FROM admins WHERE email = ?", email)) return go("/admin/usuarios", "err", "Já existe um usuário com este e-mail.");
  await run("INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, ?)", email, name, hashPassword(pw), role);
  go("/admin/usuarios", "ok", "Usuário criado.");
}

export async function adminUserAction(form: FormData) {
  const me = await requireOwner();
  const id = int(form, "id");
  const op = str(form, "op");
  if (id === me.id && op === "toggle") return go("/admin/usuarios", "err", "Você não pode desativar seu próprio usuário.");
  if (op === "toggle") {
    await run("UPDATE admins SET active = 1 - active WHERE id = ?", id);
    await run("DELETE FROM sessions WHERE admin_id = ?", id);
  } else if (op === "password") {
    const pw = String(form.get("password") ?? "");
    if (pw.length < 8) return go("/admin/usuarios", "err", "A senha deve ter ao menos 8 caracteres.");
    await changePassword(id, pw);
  }
  go("/admin/usuarios", "ok", "Usuário atualizado.");
}

export async function changeOwnPasswordAction(form: FormData) {
  const me = await requireAdmin();
  const cur = (await get<{ password_hash: string }>("SELECT password_hash FROM admins WHERE id = ?", me.id))!;
  if (!verifyPassword(String(form.get("current") ?? ""), cur.password_hash)) return go("/admin/usuarios", "err", "Senha atual incorreta.");
  const pw = String(form.get("password") ?? "");
  if (pw.length < 8) return go("/admin/usuarios", "err", "A nova senha deve ter ao menos 8 caracteres.");
  await changePassword(me.id, pw);
  redirect("/admin/login");
}
