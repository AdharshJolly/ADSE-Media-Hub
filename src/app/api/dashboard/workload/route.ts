import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTeamWorkload } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const workload = await getTeamWorkload();

    return NextResponse.json({ success: true, workload }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Get team workload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch workload' }, { status: 500 });
  }
}
