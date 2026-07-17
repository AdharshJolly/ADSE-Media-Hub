import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, supabase } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);

    let query = supabase
      .from('tasks')
      .select('id, title, deadline, status, priority, assigned_to, created_by');

    // Team members only see their own tasks
    if (currentUser?.role === 'team_member') {
      query = query.eq('assigned_to', session.userId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Get calendar tasks error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Get assignee names
    const { data: users } = await supabase.from('users').select('id, name');
    const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

    const tasksWithNames = (tasks || []).map(task => ({
      ...task,
      assigned_to_name: userMap.get(task.assigned_to) || 'Unassigned',
    }));

    return NextResponse.json({ success: true, tasks: tasksWithNames }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Get calendar tasks error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
