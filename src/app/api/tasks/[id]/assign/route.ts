import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, getUserById, createNotification, logTaskActivity } from '@/lib/db';
import { sendTaskAssignedEmail } from '@/lib/email';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { assignTaskSchema } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, assignTaskSchema);
    if (bad) return bad;

    const task = await getTaskById(taskId);
    if (!task) return fail('Task not found', 404);

    const assignee = await getUserById(data.assignedTo);
    if (!assignee || !assignee.is_active || !assignee.is_approved) {
      return fail('User not found or inactive', 404);
    }

    const success = await updateTask(taskId, { assigned_to: data.assignedTo });
    if (!success) return fail('Failed to assign task', 500);

    await logTaskActivity(taskId, session.userId, 'assigned', { assignee_name: assignee.name });

    await createNotification({
      recipient_id: data.assignedTo,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned a new task: "${task.title}". Deadline: ${new Date(task.deadline).toLocaleDateString()}`,
      related_task_id: taskId,
      is_read: false,
    });

    sendTaskAssignedEmail(
      assignee.email,
      assignee.name,
      task.title,
      task.description,
      task.deadline,
      task.priority
    ).catch(console.error);

    return NextResponse.json({ success: true, message: 'Task assigned successfully' });
  } catch (error) {
    console.error('Assign task error:', error);
    return fail('Failed to assign task', 500);
  }
}
