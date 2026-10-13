import { NextResponse } from 'next/server';
import { getTeamWorkload } from '@/lib/db';
import { authenticate, fail, STAFF_ROLES } from '@/lib/api';

export async function GET() {
  try {
    const { response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const workload = await getTeamWorkload();

    return NextResponse.json({ success: true, workload }, {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('Get team workload error:', error);
    return fail('Failed to fetch workload', 500);
  }
}
