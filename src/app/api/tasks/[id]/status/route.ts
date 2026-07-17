import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskById, updateTaskStatus, getUserById } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const currentUser = await getUserById(session.userId);
    if (currentUser?.role === 'team_member' && task.assigned_to !== session.userId) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const success = await updateTaskStatus(taskId, status);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update task status' }, { status: 500 });
  }
}
