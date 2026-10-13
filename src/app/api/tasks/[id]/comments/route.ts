import { NextRequest, NextResponse } from 'next/server';
import { getTaskComments, createTaskComment, logTaskActivity, createNotification, getUserById, getTaskAssignees } from '@/lib/db';
import { authenticate, fail, getAccessibleTask, parseBody } from '@/lib/api';
import { commentSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    if (!(await getAccessibleTask(taskId, session))) return fail('Task not found', 404);

    const comments = await getTaskComments(taskId);
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return fail('Failed to fetch comments', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const task = await getAccessibleTask(taskId, session);
    if (!task) return fail('Task not found', 404);

    const { data, response: bad } = await parseBody(request, commentSchema);
    if (bad) return bad;

    const comment = await createTaskComment(taskId, session.userId, data.content);
    if (!comment) return fail('Failed to create comment', 500);

    await logTaskActivity(taskId, session.userId, 'commented', { comment_id: comment.id });

    // Tell the other people on the task (assignee + creator), never the author
    const author = await getUserById(session.userId);
    const assignees = await getTaskAssignees(taskId);
    const recipients = new Set([task.assigned_to, task.created_by, ...assignees.map((a) => a.user_id)].filter((id): id is string => !!id && id !== session.userId));
    await Promise.all(
      [...recipients].map((recipientId) =>
        createNotification({
          recipient_id: recipientId,
          type: 'comment',
          title: 'New comment',
          message: `${author?.name || 'Someone'} commented on "${task.title}".`,
          related_task_id: taskId,
          is_read: false,
        })
      )
    );

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Create comment error:', error);
    return fail('Failed to create comment', 500);
  }
}
