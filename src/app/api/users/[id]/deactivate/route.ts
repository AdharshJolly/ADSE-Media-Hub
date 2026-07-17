import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, updateRow, getCurrentUser, SHEETS } from '@/lib/google-sheets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getCurrentUser(session.userId);
    if (!currentUser || (currentUser[4] !== 'coordinator' && currentUser[4] !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ success: false, error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    const users = await getSheetData(SHEETS.USERS);
    const userIndex = users.findIndex((row, index) => index > 0 && row[0] === userId);
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userRow = users[userIndex];
    userRow[6] = 'FALSE';
    await updateRow(SHEETS.USERS, userIndex, userRow);

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to deactivate user' }, { status: 500 });
  }
}
