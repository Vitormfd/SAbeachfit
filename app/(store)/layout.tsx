import { CartProvider } from "@/components/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSettings } from "@/lib/settings";
import { onlyDigits } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <CartProvider>
      {/* Marca o documento como "com JS" para que as animações de entrada só se escondam quando puderem revelar. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <a href="#conteudo" className="skip">
        Ir para o conteúdo
      </a>
      <Header />
      <main id="conteudo">{children}</main>
      <Footer />
      <a className="wa-float" href={`https://wa.me/${onlyDigits(s.whatsapp)}`} target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8L4 20z" />
          <path d="M9 9.5c.5 2 2.5 4 5 5l1.5-1.2-1.8-1-.9.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.9-1-1.8L9 9.5z" />
        </svg>
      </a>
    </CartProvider>
  );
}
