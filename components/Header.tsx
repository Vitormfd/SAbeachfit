import { getSettings } from "@/lib/settings";
import { categoryTree } from "@/lib/catalog";
import { formatMoney } from "@/lib/util";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const s = await getSettings();
  const cats = (await categoryTree()).map((c) => ({ name: c.name, slug: c.slug, children: c.children.map((x) => ({ name: x.name, slug: x.slug })) }));
  const fee = parseInt(s.delivery_fee_cents, 10) || 0;
  const announce = [
    "Enviamos para todo o Brasil",
    s.delivery_enabled === "1" && fee > 0 && s.local_city ? `Frete fixo de ${formatMoney(fee)} em ${s.local_city}` : "",
    "Pedidos finalizados pelo WhatsApp",
  ].filter(Boolean);
  return <HeaderClient name={s.store_name} logoUrl={s.logo_url} cats={cats} announce={announce} />;
}
