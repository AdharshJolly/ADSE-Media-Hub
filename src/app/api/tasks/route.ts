import { NextRequest, NextResponse } from 'next/server';
import { getTasksPaginated, createTask, setTaskAssignees, getUserById, getRequests, logTaskActivity, createNotification } from '@/lib/db';
import { sendTaskAssignedEmail } from '@/lib/email';
import { authenticate, fail, parseBody, parsePagination, STAFF_ROLES } from '@/lib/api';
import { createTaskSchema } from '@/lib/validation';
import type { TaskStatus } from '@/types/database';

const STATUSES = ['pending', 'in_progress', 'in_review', 'completed', 'overdue', 'active', 'needs_review'];

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status = statusParam && STATUSES.includes(statusParam) ? (statusParam as TaskStatus | 'active' | 'needs_review') : undefined;
    const assignedTo = searchParams.get('assignedTo');
    const { page, pageSize } = parsePagination(searchParams);

    // Strip characters that have meaning in PostgREST filter syntax
    const search = (searchParams.get('search') || '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 100);
    const filters: Parameters<typeof getTasksPaginated>[2] = { status, search: search || undefined };
    if (session.role === 'team_member') {
      filters.assigned_to = session.userId;
    } else if (session.role === 'requestor') {
      const mine = await getRequests({ requestor_id: session.userId });
      filters.request_ids = mine.map(r => r.id);
    } else if (assignedTo) {
      filters.assigned_to = assignedTo;
    }

    const result = await getTasksPaginated(page, pageSize, filters);

    return NextResponse.json({ success: true, ...result }, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=15' },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return fail('Failed to fetch tasks', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, createTaskSchema);
    if (bad) return bad;

    const ids = [...new Set(data.assigneeIds ?? (data.assignedTo ? [data.assignedTo] : []))];
    if (ids.length === 0) return fail('Pick at least one assignee', 400);
    const assignedUsers = await Promise.all(ids.map((id) => getUserById(id)));
    if (assignedUsers.some((u) => !u || !u.is_active || !u.is_approved)) {
      return fail('Assigned user not found or inactive', 404);
    }

    const task = await createTask({
      request_id: data.requestId || null,
      created_by: session.userId,
      assigned_to: ids[0],
      title: data.title,
      description: data.description,
      media_type: data.mediaType,
      priority: data.priority,
      deadline: data.deadline,
      status: 'pending',
      completion_date: null,
      notes: data.notes,
    });

    if (!task) return fail('Failed to create task', 500);
    await setTaskAssignees(task.id, ids);

    await logTaskActivity(task.id, session.userId, 'created', { title: data.title });

    for (const u of assignedUsers) {
      if (!u) continue;
      await createNotification({
        recipient_id: u.id,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned a new task: "${data.title}". Deadline: ${new Date(data.deadline).toLocaleDateString()}`,
        related_task_id: task.id,
        is_read: false,
      });
      sendTaskAssignedEmail(u.email, u.name, data.title, data.description, data.deadline, data.priority).catch(console.error);
    }

    return NextResponse.json({ success: true, taskId: task.id, message: 'Task created successfully' });
  } catch (error) {
    console.error('Create task error:', error);
    return fail('Failed to create task', 500);
  }
}
