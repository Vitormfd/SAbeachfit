import { all } from "@/lib/db";

export async function categoryOptions() {
  const rows = await all<{ id: number; name: string; parent_id: number | null }>("SELECT id, name, parent_id FROM categories ORDER BY position, name");
  const out: { id: number; label: string }[] = [];
  for (const c of rows.filter((r) => r.parent_id === null)) {
    out.push({ id: c.id, label: c.name });
    for (const ch of rows.filter((r) => r.parent_id === c.id)) out.push({ id: ch.id, label: `${c.name} › ${ch.name}` });
  }
  return out;
}
