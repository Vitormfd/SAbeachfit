import { normalizeCity } from "./util";

export type ShippingConfig = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  feeCents: number;
  localCity: string;
  freeAboveCents: number;
};

export type DeliveryQuote = { feeCents: number; pending: boolean; label: string };

/** Regra única usada no checkout (prévia) e no servidor (valor oficial). */
export function quoteDelivery(cfg: ShippingConfig, method: "pickup" | "delivery", city: string, subtotalCents: number): DeliveryQuote {
  if (method === "pickup") return { feeCents: 0, pending: false, label: "Retirada (sem custo)" };
  const isLocal = !cfg.localCity || normalizeCity(city) === normalizeCity(cfg.localCity);
  if (!isLocal) return { feeCents: 0, pending: true, label: "A combinar pelo WhatsApp" };
  if (cfg.freeAboveCents > 0 && subtotalCents >= cfg.freeAboveCents) return { feeCents: 0, pending: false, label: "Grátis" };
  return { feeCents: cfg.feeCents, pending: false, label: "" };
}
