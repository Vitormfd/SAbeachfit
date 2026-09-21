import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

// Somente desenvolvimento (sem Supabase). Com SUPABASE_URL, next.config.mjs reescreve /media/* para o Storage
// antes de chegar aqui.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-z0-9-]+\.(jpg|png|webp|gif)$/.test(file)) return new Response("Not found", { status: 404 });
  const supa = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (supa) return NextResponse.redirect(`${supa}/storage/v1/object/public/media/${file}`, 307);
  const dir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"));
  try {
    const data = await fs.readFile(path.join(dir, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[file.split(".")[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
