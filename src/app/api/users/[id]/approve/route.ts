import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, updateRow } from '@/lib/google-sheets';
import { sendAccountApprovedEmail } from '@/lib/email';
import { SHEETS } from '@/lib/google-sheets';

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

    // Check if user is coordinator or student head
    const users = await getSheetData(SHEETS.USERS);
    const currentUser = users.find((row, index) => index > 0 && row[0] === session.userId);
    
    if (!currentUser || (currentUser[4] !== 'coordinator' && currentUser[4] !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    // Find user to approve
    const userIndex = users.findIndex((row, index) => index > 0 && row[0] === userId);
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update approval status (column 7 = is_approved)
    const userRow = users[userIndex];
    userRow[7] = 'TRUE';
    await updateRow(SHEETS.USERS, userIndex, userRow);

    // Send welcome email
    await sendAccountApprovedEmail(userRow[1], userRow[3]);

    return NextResponse.json({ success: true, message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve user' }, { status: 500 });
  }
}
