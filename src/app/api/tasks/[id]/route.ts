import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskById, getUserById } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const currentUser = await getUserById(session.userId);
    if (currentUser?.role === 'team_member' && task.assigned_to !== session.userId) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function DELETE(
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

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Delete task error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
  }
}
