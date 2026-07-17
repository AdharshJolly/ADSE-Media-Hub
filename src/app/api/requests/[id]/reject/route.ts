import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateRequest, getUserById, getRequestById, createNotification } from '@/lib/db';
import { sendRequestRejectedEmail } from '@/lib/email';

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

    // Get the request details
    const requestData = await getRequestById(requestId);
    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    const success = await updateRequest(requestId, {
      status: 'rejected',
      coordinator_notes: notes || '',
    });

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to reject request' }, { status: 500 });
    }

    // Notify requestor
    await createNotification({
      recipient_id: requestData.requestor_id,
      type: 'request_rejected',
      title: 'Request Rejected',
      message: `Your request "${requestData.title}" has been rejected. ${notes ? `Reason: ${notes}` : ''}`,
      related_task_id: null,
      is_read: false,
    });

    // Send email to requestor
    const requestor = await getUserById(requestData.requestor_id);
    if (requestor) {
      sendRequestRejectedEmail(requestor.email, requestor.name, requestData.title, notes).catch(console.error);
    }

    return NextResponse.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reject request' }, { status: 500 });
  }
}
