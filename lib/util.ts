export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatMoney(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** "12,90" | "12.90" | "1.234,56" -> centavos. Retorna null se inválido. */
export function parseMoney(input: string): number | null {
  const s = input.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function effectivePrice(p: { price_cents: number; promo_price_cents: number | null }): number {
  return p.promo_price_cents != null && p.promo_price_cents < p.price_cents ? p.promo_price_cents : p.price_cents;
}

export function formatDateTime(iso: string): string {
  // O banco devolve ISO 8601 (UTC).
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });
}

export function orderNumber(id: number): string {
  return "#" + String(id).padStart(4, "0");
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function normalizeCity(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const ORDER_STATUSES = [
  { key: "awaiting", label: "Aguardando confirmação" },
  { key: "confirmed", label: "Pedido confirmado" },
  { key: "preparing", label: "Em preparação" },
  { key: "ready", label: "Pronto para retirada / envio" },
  { key: "completed", label: "Concluído" },
  { key: "canceled", label: "Cancelado" },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["key"];
export const statusLabel = (k: string) => ORDER_STATUSES.find((s) => s.key === k)?.label ?? k;

export const PAYMENT_LABELS: Record<string, string> = { unpaid: "Não pago", paid: "Pago", refunded: "Reembolsado" };

export const SIZES_PRESET = ["PP", "P", "M", "G", "GG", "XG", "Único", "34", "36", "38", "40", "42", "44"];
