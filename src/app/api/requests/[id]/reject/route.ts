import { NextRequest, NextResponse } from 'next/server';
import { updateRequest, getUserById, getRequestById, createNotification } from '@/lib/db';
import { sendRequestRejectedEmail } from '@/lib/email';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { decisionSchema } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const { response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, decisionSchema);
    if (bad) return bad;

    const requestData = await getRequestById(requestId);
    if (!requestData) return fail('Request not found', 404);
    if (requestData.status !== 'pending') return fail(`Request is already ${requestData.status}`, 409);

    const success = await updateRequest(requestId, {
      status: 'rejected',
      coordinator_notes: data.notes,
    });
    if (!success) return fail('Failed to reject request', 500);

    await createNotification({
      recipient_id: requestData.requestor_id,
      type: 'request_rejected',
      title: 'Request Rejected',
      message: `Your request "${requestData.title}" has been rejected.${data.notes ? ` Reason: ${data.notes}` : ''}`,
      related_task_id: null,
      is_read: false,
    });

    const requestor = await getUserById(requestData.requestor_id);
    if (requestor) {
      sendRequestRejectedEmail(requestor.email, requestor.name, requestData.title, data.notes).catch(console.error);
    }

    return NextResponse.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    return fail('Failed to reject request', 500);
  }
}
