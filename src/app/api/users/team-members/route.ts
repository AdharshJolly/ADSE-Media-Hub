import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTeamMembers } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const teamMembers = await getTeamMembers();

    return NextResponse.json({ success: true, teamMembers }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch team members' }, { status: 500 });
  }
}
