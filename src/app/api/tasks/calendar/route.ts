import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate, fail } from '@/lib/api';
import { getAssignedTaskIds } from '@/lib/db';

export async function GET() {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    let query = supabase
      .from('tasks')
      .select('id, title, deadline, status, priority, assigned_to, created_by, request_id');

    if (session.role === 'team_member') {
      const mine = await getAssignedTaskIds(session.userId);
      if (mine.length === 0) return NextResponse.json({ success: true, tasks: [] });
      query = query.in('id', mine);
    } else if (session.role === 'requestor') {
      const { data: mine } = await supabase.from('requests').select('id').eq('requestor_id', session.userId);
      const ids = (mine || []).map(r => r.id);
      if (ids.length === 0) return NextResponse.json({ success: true, tasks: [] });
      query = query.in('request_id', ids);
    }

    const { data: tasks, error } = await query;
    if (error) {
      console.error('Get calendar tasks error:', error);
      return fail('Failed to fetch tasks', 500);
    }

    const { data: users } = await supabase.from('users').select('id, name');
    const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

    const tasksWithNames = (tasks || []).map(task => ({
      ...task,
      assigned_to_name: userMap.get(task.assigned_to) || 'Unassigned',
    }));

    return NextResponse.json({ success: true, tasks: tasksWithNames }, {
      headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' },
    });
  } catch (error) {
    console.error('Get calendar tasks error:', error);
    return fail('Failed to fetch tasks', 500);
  }
}
