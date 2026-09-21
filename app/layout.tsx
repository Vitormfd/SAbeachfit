import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { getSettingsSafe, siteUrl } from "@/lib/settings";

const serif = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-sans", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettingsSafe();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${s.store_name} — ${s.tagline}`, template: `%s | ${s.store_name}` },
    description: `${s.tagline}. ${s.about}`,
    openGraph: { type: "website", locale: "pt_BR", siteName: s.store_name },
  };
}

// Tudo depende do banco em tempo de execução: nada é pré-renderizado no build.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#fffcf8", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
