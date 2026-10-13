import { NextRequest, NextResponse } from 'next/server';
import { authenticate, fail, parseBody } from '@/lib/api';
import { settingsSchema } from '@/lib/validation';
import { getSettings, updateSettings } from '@/lib/settings';

export async function GET() {
  try {
    const { response } = await authenticate(['coordinator']);
    if (response) return response;

    return NextResponse.json({ success: true, settings: await getSettings() });
  } catch (error) {
    console.error('Get settings error:', error);
    return fail('Failed to fetch settings', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await authenticate(['coordinator']);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, settingsSchema);
    if (bad) return bad;

    return NextResponse.json({ success: true, settings: await updateSettings(data) });
  } catch (error) {
    console.error('Update settings error:', error);
    return fail('Failed to update settings', 500);
  }
}
