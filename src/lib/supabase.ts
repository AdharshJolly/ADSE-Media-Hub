import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Server-only client. Uses the service role key, which bypasses RLS.
// Never import this from a 'use client' file.
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
