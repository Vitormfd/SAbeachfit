import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Imagens enviadas pelo painel.
 *  - Com SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: Supabase Storage (bucket público "media"). Obrigatório na Vercel (disco só leitura).
 *  - Sem elas (desenvolvimento): pasta local ./data/uploads.
 * Em ambos os casos o endereço salvo no banco é "/media/<arquivo>" (na Vercel, next.config.mjs reescreve para o Storage).
 */
export const BUCKET = "media";
const supaUrl = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supaKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const usingSupabase = () => !!(supaUrl() && supaKey());
export const localDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"));

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
export const mimeFor = (ext: string) => MIME[ext];

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const res = await fetch(`${supaUrl()}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supaKey()}`, apikey: supaKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: Object.values(MIME) }),
  });
  // 200 = criado; 400/409 "already exists" = ok
  if (!res.ok && res.status !== 409 && res.status !== 400) throw new Error(`Storage: falha ao preparar o bucket (${res.status})`);
  bucketReady = true;
}

export async function saveImage(name: string, buf: Buffer, ext: string): Promise<string> {
  if (usingSupabase()) {
    await ensureBucket();
    const res = await fetch(`${supaUrl()}/storage/v1/object/${BUCKET}/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${supaKey()}`, apikey: supaKey(), "Content-Type": MIME[ext], "Cache-Control": "max-age=31536000", "x-upsert": "false" },
      body: new Uint8Array(buf),
    });
    if (!res.ok) throw new Error(`Storage: falha no envio (${res.status})`);
  } else {
    if (process.env.VERCEL) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para enviar imagens na Vercel.");
    await fs.mkdir(localDir(), { recursive: true });
    await fs.writeFile(path.join(localDir(), name), buf);
  }
  return `/media/${name}`;
}
