import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, OrderError } from "@/lib/orders";

const schema = z.object({
  idempotencyKey: z.string().min(16).max(80),
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  phone: z.string().trim().max(30).default(""),
  method: z.enum(["pickup", "delivery"]),
  street: z.string().trim().max(160).default(""),
  number: z.string().trim().max(20).default(""),
  neighborhood: z.string().trim().max(80).default(""),
  city: z.string().trim().max(80).default(""),
  complement: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(600).default(""),
  items: z.array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(99) })).min(1, "Seu carrinho está vazio.").max(50),
});

// Limite simples por IP (memória do processo). Em produção com várias instâncias, use um limitador compartilhado.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (limited(ip)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const d = parsed.data;

  if (d.method === "delivery") {
    if (!d.street || !d.number || !d.neighborhood || !d.city) {
      return NextResponse.json({ error: "Preencha rua, número, bairro e cidade para entrega." }, { status: 400 });
    }
  }
  if (d.phone && d.phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Telefone inválido (inclua o DDD)." }, { status: 400 });

  const address = [`${d.street}, ${d.number}`, d.complement, d.neighborhood, d.city].filter(Boolean).join(" — ");
  try {
    const r = await createOrder({
      idempotencyKey: d.idempotencyKey,
      name: d.name,
      phone: d.phone,
      method: d.method,
      address,
      city: d.city,
      notes: d.notes,
      items: d.items,
    });
    return NextResponse.json({ ok: true, orderId: r.id, token: r.token, whatsappUrl: r.whatsappUrl, duplicate: r.duplicate });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.message, code: e.code, lines: e.lines }, { status: e.code === "stock" ? 409 : 400 });
    }
    console.error("[orders] erro inesperado", e);
    return NextResponse.json({ error: "Não foi possível registrar o pedido. Tente novamente." }, { status: 500 });
  }
}
