import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskById, updateTask, getUserById, createNotification, logTaskActivity } from '@/lib/db';
import { sendTaskAssignedEmail } from '@/lib/email';

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

    // Get task details
    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Verify the assignee exists
    const assignee = await getUserById(assignedTo);
    if (!assignee) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const success = await updateTask(taskId, { assigned_to: assignedTo });
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to assign task' }, { status: 500 });
    }

    // Log activity
    await logTaskActivity(taskId, session.userId, 'assigned', { assignee_name: assignee.name });

    // Notify assigned team member
    await createNotification({
      recipient_id: assignedTo,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned a new task: "${task.title}". Deadline: ${new Date(task.deadline).toLocaleDateString()}`,
      related_task_id: taskId,
      is_read: false,
    });

    // Send email to assigned member
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
    return NextResponse.json({ success: false, error: 'Failed to assign task' }, { status: 500 });
  }
}
