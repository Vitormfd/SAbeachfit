import type { MetadataRoute } from "next";
import { all } from "@/lib/db";
import { siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await all<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM products WHERE active = 1 AND archived = 0");
  const cats = await all<{ slug: string }>("SELECT slug FROM categories WHERE active = 1");
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/catalogo?categoria=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/produto/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
