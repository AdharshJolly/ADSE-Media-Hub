import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTasksPaginated, createTask, getUserById, getTeamMembers } from '@/lib/db';
import { sendTaskAssignedEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'in_progress' | 'completed' | 'overdue' | 'active' | null;
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const currentUser = await getUserById(session.userId);

    // Team members can only see their own tasks
    const filters = {
      status: status || undefined,
      assigned_to: currentUser?.role === 'team_member' ? session.userId : (assignedTo || undefined),
    };

    const result = await getTasksPaginated(page, pageSize, filters);

    return NextResponse.json({ success: true, ...result }, {
      headers: {
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);
    if (!currentUser || (currentUser.role !== 'coordinator' && currentUser.role !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, assignedTo, title, description, mediaType, priority, deadline, notes } = body;

    if (!title || !assignedTo || !deadline) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const assignedUser = await getUserById(assignedTo);
    if (!assignedUser) {
      return NextResponse.json({ success: false, error: 'Assigned user not found' }, { status: 404 });
    }

    const task = await createTask({
      request_id: requestId || null,
      created_by: session.userId,
      assigned_to: assignedTo,
      title,
      description: description || '',
      media_type: mediaType || '',
      priority: priority || 'medium',
      deadline,
      status: 'pending',
      completion_date: null,
      notes: notes || '',
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
    }

    // Send email in background
    sendTaskAssignedEmail(
      assignedUser.email,
      assignedUser.name,
      title,
      description || '',
      deadline,
      priority || 'medium'
    ).catch(console.error);

    return NextResponse.json({ success: true, taskId: task.id, message: 'Task created successfully' });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }
}
