import { NextResponse } from 'next/server';
import { getTeamMembers } from '@/lib/db';
import { authenticate, fail, STAFF_ROLES } from '@/lib/api';

export async function GET() {
  try {
    const { response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const teamMembers = await getTeamMembers();

    return NextResponse.json({ success: true, teamMembers }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Get team members error:', error);
    return fail('Failed to fetch team members', 500);
  }
}
