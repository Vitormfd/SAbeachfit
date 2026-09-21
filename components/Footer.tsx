import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { categoryTree } from "@/lib/catalog";
import { onlyDigits } from "@/lib/util";
import { Logo } from "./Logo";

export async function Footer() {
  const s = await getSettings();
  const cats = await categoryTree();
  const ig = s.instagram.replace("@", "");
  return (
    <footer className="foot">
      <div className="container foot-grid">
        <div className="foot-brand">
          <Logo logoUrl={s.logo_url} name={s.store_name} light />
          <p>{s.about}</p>
          <a className="btn btn-light" href={`https://wa.me/${onlyDigits(s.whatsapp)}`} target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
          </a>
        </div>
        <nav aria-label="Loja">
          <h4>Loja</h4>
          <ul>
            <li><Link href="/catalogo">Todo o catálogo</Link></li>
            {cats.map((c) => (
              <li key={c.id}>
                <Link href={`/catalogo?categoria=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
            <li><Link href="/catalogo?ordem=novidades">Novidades</Link></li>
          </ul>
        </nav>
        <div>
          <h4>Como comprar</h4>
          <ul className="plain">
            <li>Escolha as peças e monte o carrinho.</li>
            <li>Envie o pedido pelo WhatsApp.</li>
            <li>Combine pagamento e {s.pickup_enabled === "1" ? "retirada ou entrega" : "entrega"} com a loja.</li>
          </ul>
        </div>
        <div>
          <h4>Contato</h4>
          <ul className="plain">
            {s.address && <li>{s.address}</li>}
            {s.hours && <li>{s.hours}</li>}
            {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
            {ig && (
              <li>
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">
                  Instagram @{ig}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="container foot-bottom">
        <span>© {new Date().getFullYear()} {s.store_name}</span>
        <span>Pagamento combinado diretamente com a loja.</span>
      </div>
    </footer>
  );
}
