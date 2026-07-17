import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateRequest, getUserById } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);
    if (!currentUser || (currentUser.role !== 'coordinator' && currentUser.role !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { notes } = body;

    const success = await updateRequest(requestId, {
      status: 'rejected',
      coordinator_notes: notes || '',
    });

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to reject request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reject request' }, { status: 500 });
  }
}
