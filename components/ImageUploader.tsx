"use client";
import { useRef, useState } from "react";

/** Reduz a foto no navegador (lado maior 1800px, WebP ~85%) — envio rápido e dentro do limite de corpo da Vercel. */
async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (blob && blob.size < file.size) return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {}
  return file;
}

export function ImageUploader({ value, onChange, multiple = false }: { value: string[]; onChange: (v: string[]) => void; multiple?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    let next = multiple ? [...value] : [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", await shrink(file));
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no envio.");
        next = [...next, data.url];
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: number) => {
    const n = [...value];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };

  return (
    <div className="uploader">
      <ul className="up-list">
        {value.map((url, i) => (
          <li key={url + i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" width={90} height={112} />
            {multiple && i === 0 && <span className="badge">Capa</span>}
            <div className="up-actions">
              {multiple && <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">←</button>}
              {multiple && <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Mover para a direita">→</button>}
              <button type="button" onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="Remover imagem">×</button>
            </div>
          </li>
        ))}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} hidden onChange={(e) => upload(e.target.files)} />
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Enviando…" : multiple ? "+ Enviar imagens" : value.length ? "Trocar imagem" : "+ Enviar imagem"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function SingleImageField({ name, initial }: { name: string; initial: string }) {
  const [v, setV] = useState<string[]>(initial ? [initial] : []);
  return (
    <>
      <input type="hidden" name={name} value={v[0] ?? ""} />
      <ImageUploader value={v} onChange={setV} />
    </>
  );
}
