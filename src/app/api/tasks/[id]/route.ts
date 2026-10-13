import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, getTaskAssignees, bustStats } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { authenticate, fail, getAccessibleTask, STAFF_ROLES } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const task = await getAccessibleTask(taskId, session);
    if (!task) return fail('Task not found', 404);

    task.assignees = await getTaskAssignees(taskId);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    return fail('Failed to fetch task', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const task = await getTaskById(taskId);
    if (!task) return fail('Task not found', 404);

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Delete task error:', error);
      return fail('Failed to delete task', 500);
    }

    bustStats();
    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return fail('Failed to delete task', 500);
  }
}
