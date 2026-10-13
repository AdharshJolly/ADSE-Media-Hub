import { randomBytes } from 'node:crypto';
import { supabase } from './supabase';

// 12 URL-safe characters (72 bits of entropy); shown to the user once by email.
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}

// Counts recent hits for `key`, records this one, and reports whether it is over `limit`.
// DB-backed so it holds across Vercel serverless instances.
export async function isRateLimited(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await supabase
    .from('auth_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', since);

  await supabase.from('auth_rate_limits').insert({ key });
  return (count ?? 0) >= limit;
}

// Housekeeping so the table doesn't grow forever.
export async function pruneRateLimits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  await supabase.from('auth_rate_limits').delete().lt('created_at', cutoff);
}
