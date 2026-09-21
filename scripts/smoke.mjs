// Teste de integração contra o servidor em execução: node scripts/smoke.mjs
const B = process.env.BASE || "http://localhost:3000";
const post = (p, body, h = {}) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `10.${Math.floor(Math.random()*250)}.${Math.floor(Math.random()*250)}.${Math.floor(Math.random()*250)}`, ...h }, body: JSON.stringify(body) }).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})) }));
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };

// variação com estoque conhecido: Conjunto Fitness Preto/P = 5
const html = await (await fetch(B + "/produto/conjunto-fitness")).text();
ok(html.includes("Conjunto Fitness") && html.includes("application/ld+json"), "página do produto renderiza com JSON-LD");
const cart = await post("/api/cart", { items: [{ variantId: 1, qty: 1 }, { variantId: 2, qty: 1 }] });
console.log("variantes:", cart.j.lines.map(l => `${l.variantId}:${l.color}/${l.size} est=${l.stock}`).join(" | "));
const v = cart.j.lines[0]; // Preto/P
const base = { name: "Cliente Teste", phone: "75999998888", method: "pickup", items: [{ variantId: v.variantId, qty: 2 }] };
const key = () => crypto.randomUUID();

// 1) pedido válido baixa estoque
const k1 = key();
let r = await post("/api/orders", { ...base, idempotencyKey: k1 });
ok(r.s === 200 && r.j.whatsappUrl?.startsWith("https://wa.me/5575981139972?text="), "pedido criado e URL do WhatsApp gerada");
console.log(decodeURIComponent(r.j.whatsappUrl.split("text=")[1]));
const orderId = r.j.orderId;
let after = (await post("/api/cart", { items: [{ variantId: v.variantId, qty: 1 }] })).j.lines[0].stock;
ok(after === v.stock - 2, `estoque reservado (${v.stock} -> ${after})`);

// 2) idempotência
r = await post("/api/orders", { ...base, idempotencyKey: k1 });
ok(r.s === 200 && r.j.duplicate === true && r.j.orderId === orderId, "mesma chave não duplica pedido");
after = (await post("/api/cart", { items: [{ variantId: v.variantId, qty: 1 }] })).j.lines[0].stock;
ok(after === v.stock - 2, "estoque não baixou duas vezes");

// 3) acima do estoque
r = await post("/api/orders", { ...base, idempotencyKey: key(), items: [{ variantId: v.variantId, qty: 99 }] });
ok(r.s === 409 && r.j.code === "stock", "quantidade acima do estoque é bloqueada (409)");

// 4) concorrência: 10 pedidos simultâneos de 1 unidade sobre o saldo restante
const left = after;
const results = await Promise.all(Array.from({ length: left + 5 }, () => post("/api/orders", { ...base, idempotencyKey: key(), items: [{ variantId: v.variantId, qty: 1 }] })));
const okN = results.filter(x => x.s === 200).length, noN = results.filter(x => x.s === 409).length;
ok(okN === left && noN === 5, `concorrência: ${okN} aceitos / ${noN} recusados (saldo era ${left})`);
after = (await post("/api/cart", { items: [{ variantId: v.variantId, qty: 1 }] })).j.lines[0].stock;
ok(after === 0, "estoque final = 0 (nunca negativo)");

// 5) validação
r = await post("/api/orders", { ...base, idempotencyKey: key(), method: "delivery" });
ok(r.s === 400, "entrega sem endereço rejeitada");
r = await post("/api/orders", { ...base, idempotencyKey: key(), name: "A" });
ok(r.s === 400, "nome inválido rejeitado");

// 6) entrega local x fora da cidade (usa variação com estoque)
const v2 = (await post("/api/cart", { items: [{ variantId: 10, qty: 1 }] })).j.lines[0];
const addr = { street: "Rua A", number: "10", neighborhood: "Centro" };
r = await post("/api/orders", { ...base, ...addr, city: "Feira de Santana", method: "delivery", idempotencyKey: key(), items: [{ variantId: v2.variantId, qty: 1 }] });
ok(r.s === 200 && decodeURIComponent(r.j.whatsappUrl).includes("R$ 9,99"), "frete fixo R$ 9,99 em Feira de Santana");
r = await post("/api/orders", { ...base, ...addr, city: "Salvador", method: "delivery", idempotencyKey: key(), items: [{ variantId: v2.variantId, qty: 1 }] });
ok(r.s === 200 && decodeURIComponent(r.j.whatsappUrl).includes("A combinar"), "fora da cidade: frete a combinar");

// 7) admin protegido
let res = await fetch(B + "/admin", { redirect: "manual" });
ok(res.status === 307 && res.headers.get("location")?.includes("/admin/login"), "/admin sem sessão redireciona ao login");
res = await fetch(B + "/api/admin/upload", { method: "POST", redirect: "manual" });
ok(res.status !== 200, "upload sem sessão negado (" + res.status + ")");
res = await fetch(B + "/admin/pedidos/1", { headers: { cookie: "sa_admin=forjado" }, redirect: "manual" });
ok([302, 303, 307].includes(res.status), "cookie forjado não dá acesso (" + res.status + ")");
console.log(fails ? `\n${fails} FALHA(S)` : "\nTODOS OS TESTES PASSARAM");
process.exit(fails ? 1 : 0);
