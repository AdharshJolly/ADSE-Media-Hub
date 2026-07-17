import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { findRowByColumn } from '@/lib/google-sheets';
import { SHEETS } from '@/lib/google-sheets';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userData = await findRowByColumn(SHEETS.USERS, 0, session.userId);
    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = {
      user_id: userData.row[0],
      email: userData.row[1],
      name: userData.row[3],
      role: userData.row[4],
      skills: userData.row[5],
      is_active: userData.row[6] === 'TRUE' || userData.row[6] === 'true',
      is_approved: userData.row[7] === 'TRUE' || userData.row[7] === 'true',
      created_at: userData.row[8],
    };

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get user' }, { status: 500 });
  }
}
