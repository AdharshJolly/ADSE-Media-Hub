import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, SHEETS } from '@/lib/google-sheets';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const users = await getSheetData(SHEETS.USERS);
    
    const teamMembers = users
      .slice(1)
      .filter(
        (row) =>
          row[4] === 'team_member' &&
          (row[6] === 'TRUE' || row[6] === 'true') &&
          (row[7] === 'TRUE' || row[7] === 'true')
      )
      .map((row) => ({
        user_id: row[0],
        email: row[1],
        name: row[3],
        skills: row[5],
      }));

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
