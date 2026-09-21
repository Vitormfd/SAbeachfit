import { statusLabel } from "@/lib/util";

export type SP = Record<string, string | string[] | undefined>;
export const spOne = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function Flash({ sp }: { sp: SP }) {
  const ok = spOne(sp.ok);
  const err = spOne(sp.err);
  if (!ok && !err) return null;
  return (
    <div className={`flash ${err ? "flash-err" : "flash-ok"}`} role={err ? "alert" : "status"}>
      {err || ok}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status}`}>{statusLabel(status)}</span>;
}
