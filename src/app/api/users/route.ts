import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, getUserById } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);
    if (!currentUser || (currentUser.role !== 'coordinator' && currentUser.role !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const users = await getAllUsers();
    
    // Map to include both id and user_id for backward compatibility
    const mappedUsers = users.map(u => ({
      user_id: u.id,
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      skills: u.skills,
      is_active: u.is_active,
      is_approved: u.is_approved,
      created_at: u.created_at,
    }));

    return NextResponse.json({ success: true, users: mappedUsers }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
