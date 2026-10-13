import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTaskStatus, logTaskActivity, getRequestById, createNotification } from '@/lib/db';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { taskStatusSchema } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, taskStatusSchema);
    if (bad) return bad;

    const task = await getTaskById(taskId);
    if (!task) return fail('Task not found', 404);

    // Only staff or the assignee may change status
    const allowed = STAFF_ROLES.includes(session.role) || task.assigned_to === session.userId;
    if (!allowed) return fail('Permission denied', 403);

    const success = await updateTaskStatus(taskId, data.status);
    if (!success) return fail('Failed to update task', 500);

    await logTaskActivity(taskId, session.userId, 'status_changed', { from: task.status, to: data.status });

    // Tell the people waiting on the work (creator + original requestor) when it's done
    if (data.status === 'completed' && task.status !== 'completed') {
      const recipients = new Set<string>([task.created_by]);
      if (task.request_id) {
        const req = await getRequestById(task.request_id);
        if (req) recipients.add(req.requestor_id);
      }
      recipients.delete(session.userId);
      await Promise.all(
        [...recipients].map((recipientId) =>
          createNotification({
            recipient_id: recipientId,
            type: 'status_update',
            title: 'Task completed',
            message: `"${task.title}" has been marked complete.`,
            related_task_id: taskId,
            is_read: false,
          })
        )
      );
    }

    return NextResponse.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    console.error('Update task status error:', error);
    return fail('Failed to update task status', 500);
  }
}
