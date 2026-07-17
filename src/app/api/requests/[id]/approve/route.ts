import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateRequest, getUserById, getRequestById, createTask, createNotification } from '@/lib/db';
import { sendRequestApprovedEmail } from '@/lib/email';

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

    // Update request status
    const success = await updateRequest(requestId, {
      status: 'approved',
      coordinator_notes: notes || '',
    });

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to approve request' }, { status: 500 });
    }

    // Auto-create a task from the request
    const task = await createTask({
      request_id: requestId,
      created_by: session.userId,
      assigned_to: session.userId, // Temporary: assign to self until coordinator assigns someone
      title: requestData.title,
      description: requestData.description,
      media_type: requestData.media_type,
      priority: requestData.priority,
      deadline: requestData.deadline,
      status: 'pending',
      completion_date: null,
      notes: `Auto-created from request. ${notes || ''}`,
    });

    // Notify requestor
    await createNotification({
      recipient_id: requestData.requestor_id,
      type: 'request_approved',
      title: 'Request Approved',
      message: `Your request "${requestData.title}" has been approved and a task has been created.`,
      related_task_id: task?.id || null,
      is_read: false,
    });

    // Send email to requestor
    const requestor = await getUserById(requestData.requestor_id);
    if (requestor) {
      sendRequestApprovedEmail(requestor.email, requestor.name, requestData.title).catch(console.error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Request approved and task created',
      taskId: task?.id,
      taskCreated: !!task
    });
  } catch (error) {
    console.error('Approve request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve request' }, { status: 500 });
  }
}
