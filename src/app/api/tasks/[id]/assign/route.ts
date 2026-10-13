import { NextRequest, NextResponse } from 'next/server';
import {
  getTaskById,
  getTaskAssignees,
  setTaskAssignees,
  getUserById,
  createNotification,
  logTaskActivity,
} from '@/lib/db';
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
    const ids = [...new Set(data.assigneeIds ?? (data.assignedTo ? [data.assignedTo] : []))];
    if (ids.length === 0) return fail('Pick at least one assignee', 400);

    const task = await getTaskById(taskId);
    if (!task) return fail('Task not found', 404);
    if (task.status === 'in_review' || task.status === 'completed') {
      return fail('Request rework before changing who is on this task', 400);
    }

    const users = await Promise.all(ids.map((id) => getUserById(id)));
    if (users.some((u) => !u || !u.is_active || !u.is_approved)) {
      return fail('User not found or inactive', 404);
    }

    const before = new Set((await getTaskAssignees(taskId)).map((a) => a.user_id));
    if (!(await setTaskAssignees(taskId, ids))) return fail('Failed to assign task', 500);

    await logTaskActivity(taskId, session.userId, 'assigned', {
      assignee_name: users.map((u) => u!.name).join(', '),
    });

    // Only tell people who are new to the task
    for (const u of users) {
      if (!u || before.has(u.id)) continue;
      await createNotification({
        recipient_id: u.id,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned a new task: "${task.title}". Deadline: ${new Date(task.deadline).toLocaleDateString()}`,
        related_task_id: taskId,
        is_read: false,
      });
      sendTaskAssignedEmail(u.email, u.name, task.title, task.description, task.deadline, task.priority).catch(console.error);
    }

    return NextResponse.json({ success: true, message: 'Task assigned successfully' });
  } catch (error) {
    console.error('Assign task error:', error);
    return fail('Failed to assign task', 500);
  }
}
