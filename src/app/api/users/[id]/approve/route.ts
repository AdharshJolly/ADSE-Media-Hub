import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateUser, getUserById } from '@/lib/db';
import { sendAccountApprovedEmail } from '@/lib/email';

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

    const currentUser = await getUserById(session.userId);
    if (!currentUser || (currentUser.role !== 'coordinator' && currentUser.role !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const userToApprove = await getUserById(userId);
    if (!userToApprove) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const success = await updateUser(userId, { is_approved: true });
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to approve user' }, { status: 500 });
    }

    // Send email in background
    sendAccountApprovedEmail(userToApprove.email, userToApprove.name).catch(console.error);

    return NextResponse.json({ success: true, message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve user' }, { status: 500 });
  }
}
