import { supabase } from './supabase';

export interface AppSettings {
  maintenanceMode: boolean;
  emailNotifications: boolean;
}

const DEFAULTS: AppSettings = { maintenanceMode: false, emailNotifications: true };

// Read on almost every request, so keep a short per-instance cache.
const CACHE_MS = 15_000;
let cache: { value: AppSettings; at: number } | null = null;

export async function getSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error || !data) {
    console.error('Failed to load app settings:', error);
    return cache?.value ?? DEFAULTS;
  }

  const value = { ...DEFAULTS };
  for (const row of data) {
    if (row.key in value) value[row.key as keyof AppSettings] = row.value;
  }
  cache = { value, at: Date.now() };
  return value;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const rows = Object.entries(patch)
    .filter(([, v]) => typeof v === 'boolean')
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));

  if (rows.length) {
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
  }
  cache = null;
  return getSettings();
}
