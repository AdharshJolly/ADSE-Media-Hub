import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, getCurrentUser, SHEETS } from '@/lib/google-sheets';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getCurrentUser(session.userId);
    if (!currentUser || (currentUser[4] !== 'coordinator' && currentUser[4] !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const users = await getSheetData(SHEETS.USERS);
    const allUsers = users.slice(1).map((row) => ({
      user_id: row[0],
      email: row[1],
      name: row[3],
      role: row[4],
      skills: row[5],
      is_active: row[6] === 'TRUE' || row[6] === 'true',
      is_approved: row[7] === 'TRUE' || row[7] === 'true',
      created_at: row[8],
    }));

    return NextResponse.json({ success: true, users: allUsers }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
