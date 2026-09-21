import { formatMoney, onlyDigits, orderNumber } from "./util";

export type MessageOrder = {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_method: "pickup" | "delivery";
  address: string;
  notes: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  delivery_fee_pending: number;
  total_cents: number;
};
export type MessageItem = { product_name: string; color: string; size: string; qty: number; unit_price_cents: number };

/** Preenche o modelo configurável. Linhas "Rótulo: {campo}" cujo campo está vazio são removidas. */
export function buildMessage(template: string, storeName: string, o: MessageOrder, items: MessageItem[]): string {
  const itens = items
    .map((i) => `• ${i.product_name} — Cor: ${i.color} — Tamanho: ${i.size} — Qtd: ${i.qty} — ${formatMoney(i.unit_price_cents * i.qty)}`)
    .join("\n");
  const entrega =
    o.delivery_method === "pickup" ? "Retirada (sem custo)" : o.delivery_fee_pending ? "A combinar" : o.delivery_fee_cents > 0 ? formatMoney(o.delivery_fee_cents) : "Grátis";
  const values: Record<string, string> = {
    loja: storeName,
    pedido: orderNumber(o.id),
    cliente: o.customer_name,
    telefone: o.customer_phone,
    itens,
    subtotal: formatMoney(o.subtotal_cents),
    entrega,
    total: formatMoney(o.total_cents) + (o.delivery_fee_pending ? " (+ frete a combinar)" : ""),
    recebimento: o.delivery_method === "pickup" ? "Retirada" : "Entrega",
    endereco: o.delivery_method === "delivery" ? o.address : "",
    observacoes: o.notes,
  };
  return template
    .split("\n")
    .map((line) => {
      const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (keys.length && keys.every((k) => !(values[k] ?? "").trim())) {
        const rest = line.replace(/\{\w+\}/g, "").trim();
        if (/:$/.test(rest) || rest === "") return null; // linha só com rótulo vazio
      }
      return line.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");
    })
    .filter((l): l is string => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${onlyDigits(number)}?text=${encodeURIComponent(message)}`;
}
