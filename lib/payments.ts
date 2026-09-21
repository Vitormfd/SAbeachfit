import "server-only";

/**
 * Ponto de extensão para gateway de pagamento (Mercado Pago, Stripe, Pix etc.).
 * Hoje só existe o provedor "whatsapp" (pagamento combinado com a loja).
 * Para integrar um gateway: implemente PaymentProvider, registre em `providers`,
 * chame `createCharge` ao criar o pedido e trate o webhook em app/api/webhooks/<provider>/route.ts
 * atualizando orders.payment_status / payment_ref (o esquema já possui essas colunas).
 */
export type ChargeResult = { provider: string; reference: string | null; redirectUrl?: string };

export interface PaymentProvider {
  id: string;
  createCharge(order: { id: number; totalCents: number; customerName: string }): Promise<ChargeResult>;
}

export const whatsappProvider: PaymentProvider = {
  id: "whatsapp",
  async createCharge() {
    return { provider: "whatsapp", reference: null };
  },
};

export const providers: Record<string, PaymentProvider> = { whatsapp: whatsappProvider };
export const activeProvider: PaymentProvider = whatsappProvider;
