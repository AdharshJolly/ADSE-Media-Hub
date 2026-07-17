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
    if (!currentUser || currentUser.role !== 'coordinator') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const [usersRes, tasksRes, requestsRes] = await Promise.all([
      supabase.from('users').select('id, is_active, is_approved'),
      supabase.from('tasks').select('id, status'),
      supabase.from('requests').select('id, status'),
    ]);

    const users = usersRes.data || [];
    const tasks = tasksRes.data || [];
    const requests = requestsRes.data || [];

    const stats = {
      users: {
        total: users.length,
        active: users.filter(u => u.is_active && u.is_approved).length,
        pending: users.filter(u => !u.is_approved).length,
      },
      tasks: {
        total: tasks.length,
        active: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
      },
      requests: {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
      },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
