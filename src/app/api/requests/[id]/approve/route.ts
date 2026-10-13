import { NextRequest, NextResponse } from 'next/server';
import { updateRequest, getUserById, getRequestById, createTask, createNotification } from '@/lib/db';
import { sendRequestApprovedEmail } from '@/lib/email';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { decisionSchema } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const { session, response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, decisionSchema);
    if (bad) return bad;

    const requestData = await getRequestById(requestId);
    if (!requestData) return fail('Request not found', 404);
    if (requestData.status !== 'pending') return fail(`Request is already ${requestData.status}`, 409);

    const success = await updateRequest(requestId, {
      status: 'approved',
      coordinator_notes: data.notes,
    });
    if (!success) return fail('Failed to approve request', 500);

    // Auto-create a task from the request
    const task = await createTask({
      request_id: requestId,
      created_by: session.userId,
      assigned_to: session.userId, // Temporary: assigned to approver until someone is picked
      title: requestData.title,
      description: requestData.description,
      media_type: requestData.media_type,
      priority: requestData.priority,
      deadline: requestData.deadline,
      status: 'pending',
      completion_date: null,
      notes: `Auto-created from request. ${data.notes}`.trim(),
    });

    await createNotification({
      recipient_id: requestData.requestor_id,
      type: 'request_approved',
      title: 'Request Approved',
      message: `Your request "${requestData.title}" has been approved and a task has been created.`,
      related_task_id: task?.id || null,
      is_read: false,
    });

    const requestor = await getUserById(requestData.requestor_id);
    if (requestor) {
      sendRequestApprovedEmail(requestor.email, requestor.name, requestData.title).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Request approved and task created',
      taskId: task?.id,
      taskCreated: !!task,
    });
  } catch (error) {
    console.error('Approve request error:', error);
    return fail('Failed to approve request', 500);
  }
}
