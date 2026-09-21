import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { currentAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

// Limite de corpo da Vercel ≈ 4,5 MB; o painel reduz as fotos no navegador antes de enviar.
const MAX = 4 * 1024 * 1024;

// Detecta o tipo pelos bytes (não confia em nome/Content-Type enviados pelo cliente).
function sniff(b: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  if (b.subarray(0, 4).toString() === "GIF8") return "gif";
  return null;
}

export async function POST(req: Request) {
  if (!(await currentAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  // Proteção CSRF: só aceita requisições originadas do próprio site.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Imagem maior que 4 MB." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return NextResponse.json({ error: "Formato não suportado. Use JPG, PNG, WebP ou GIF." }, { status: 415 });

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  try {
    return NextResponse.json({ url: await saveImage(name, buf, ext) });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao salvar a imagem." }, { status: 500 });
  }
}
