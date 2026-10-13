import { z } from 'zod';

const envSchema = z.object({
  // Google Sheets (for sync)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SPREADSHEET_ID: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Supabase (server-only service role key; RLS is deny-all for anon)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Email
  GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL: z.string().url().optional(),
  GOOGLE_APPS_SCRIPT_EMAIL_API_KEY: z.string().optional(),

  // Cron (pg_cron -> pg_net calls /api/cron/* with this secret)
  CRON_SECRET: z.string().min(16).optional(),

  // Web push (generate with `npx web-push generate-vapid-keys`)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();
