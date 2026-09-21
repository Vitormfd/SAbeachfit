import "server-only";
import { cache } from "react";
import { all, tx, run } from "./db";
import { SETTINGS_DEFAULTS, type SettingKey } from "./settings-defaults";
import type { ShippingConfig } from "./shipping";

export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const out: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out as Settings;
});

/** Versão que nunca falha (metadados/SEO não devem derrubar a página se o banco estiver indisponível). */
export async function getSettingsSafe(): Promise<Settings> {
  try {
    return await getSettings();
  } catch {
    return { ...SETTINGS_DEFAULTS } as Settings;
  }
}

export async function saveSettings(values: Partial<Settings>) {
  await tx(async () => {
    for (const [k, v] of Object.entries(values)) {
      if (k in SETTINGS_DEFAULTS) await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", k, String(v));
    }
  });
}

export function shippingConfig(s: Settings): ShippingConfig {
  return {
    deliveryEnabled: s.delivery_enabled === "1",
    pickupEnabled: s.pickup_enabled === "1",
    feeCents: parseInt(s.delivery_fee_cents, 10) || 0,
    localCity: s.local_city,
    freeAboveCents: parseInt(s.free_delivery_above_cents, 10) || 0,
  };
}

export const siteUrl = () => (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
