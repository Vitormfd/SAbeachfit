import type { Metadata } from "next";
import { getSettings, shippingConfig } from "@/lib/settings";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <div className="container page">
      <h1 className="page-title">Finalizar pedido</h1>
      <CheckoutForm cfg={shippingConfig(s)} pickupNote={s.pickup_note} deliveryNote={s.delivery_note} />
    </div>
  );
}
