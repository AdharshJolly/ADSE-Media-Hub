import { createHash, randomBytes } from 'node:crypto';
import { supabase } from './supabase';

// 12 URL-safe characters (72 bits of entropy); shown to the user once by email.
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}

export const RESET_TOKEN_MINUTES = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Issues a one-time reset token for the user (replacing any earlier unused one).
// Only the hash is stored; the raw token goes in the emailed link.
export async function createResetToken(userId: string): Promise<string | null> {
  const token = randomBytes(32).toString('base64url');
  await supabase.from('password_reset_tokens').delete().eq('user_id', userId).is('used_at', null);
  const { error } = await supabase.from('password_reset_tokens').insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000).toISOString(),
  });
  return error ? null : token;
}

export async function deleteResetToken(token: string): Promise<void> {
  await supabase.from('password_reset_tokens').delete().eq('token_hash', hashToken(token));
}

// Atomically claims an unused, unexpired token and returns its user id.
// The conditional update means two concurrent requests cannot both succeed.
export async function consumeResetToken(token: string): Promise<string | null> {
  const { data } = await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('user_id')
    .maybeSingle();
  return data?.user_id ?? null;
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
