import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateUser, getUserById } from '@/lib/db';

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

    if (userId === session.userId) {
      return NextResponse.json({ success: false, error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    const userToDeactivate = await getUserById(userId);
    if (!userToDeactivate) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const success = await updateUser(userId, { is_active: false });
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to deactivate user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to deactivate user' }, { status: 500 });
  }
}
