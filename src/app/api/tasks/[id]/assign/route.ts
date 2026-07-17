import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskById, updateTask, getUserById } from '@/lib/db';

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

    const currentUser = await getUserById(session.userId);
    if (!currentUser || (currentUser.role !== 'coordinator' && currentUser.role !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { assignedTo } = body;

    if (!assignedTo) {
      return NextResponse.json({ success: false, error: 'assignedTo is required' }, { status: 400 });
    }

    // Verify the assignee exists and is a team member
    const assignee = await getUserById(assignedTo);
    if (!assignee) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const success = await updateTask(taskId, { assigned_to: assignedTo });
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to assign task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Task assigned successfully' });
  } catch (error) {
    console.error('Assign task error:', error);
    return NextResponse.json({ success: false, error: 'Failed to assign task' }, { status: 500 });
  }
}
