import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTaskStatus, logTaskActivity, getAssignedTaskIds } from '@/lib/db';
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

    // Only staff or an assignee may change status. Finishing goes through the review route.
    const isAssignee = (await getAssignedTaskIds(session.userId)).includes(taskId);
    if (!STAFF_ROLES.includes(session.role) && !isAssignee) return fail('Permission denied', 403);
    if (task.status === 'in_review' || task.status === 'completed') {
      return fail('This task is already submitted. Use Request rework to reopen it.', 400);
    }

    const success = await updateTaskStatus(taskId, data.status);
    if (!success) return fail('Failed to update task', 500);

    await logTaskActivity(taskId, session.userId, 'status_changed', { from: task.status, to: data.status });

    return NextResponse.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    console.error('Update task status error:', error);
    return fail('Failed to update task status', 500);
  }
}
