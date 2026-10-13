import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { authenticate, fail } from '@/lib/api';
import { getSpreadsheetUrl, syncToSheets } from '@/lib/google-sheets';

export const maxDuration = 60;

function hasCronSecret(request: NextRequest): boolean {
  const expected = env.CRON_SECRET;
  const given = request.headers.get('x-cron-secret');
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// One-way sync Supabase -> Google Sheets. Callable by a coordinator (button) or by pg_cron.
export async function POST(request: NextRequest) {
  if (!hasCronSecret(request)) {
    const { response } = await authenticate(['coordinator']);
    if (response) return response;
  }

  try {
    const result = await syncToSheets();
    return NextResponse.json({ success: true, ...result, spreadsheetUrl: getSpreadsheetUrl() });
  } catch (error) {
    console.error('Sheets sync error:', error);
    const message = error instanceof Error ? error.message : '';
    const hint = message.includes('not configured')
      ? message
      : /permission|403|404|not found/i.test(message)
        ? 'Google denied access. Share the spreadsheet with the service account as Editor.'
        : 'Sync failed';
    return fail(hint, 500);
  }
}

// Lets the admin page show the link without triggering a sync.
export async function GET() {
  const { response } = await authenticate(['coordinator']);
  if (response) return response;
  return NextResponse.json({ success: true, spreadsheetUrl: getSpreadsheetUrl() });
}
