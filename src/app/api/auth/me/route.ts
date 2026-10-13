import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { fail } from '@/lib/api';
import { getSettings } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail('Not authenticated', 401);

    const user = await getUserById(session.userId);
    if (!user) return fail('User not found', 404);

    const maintenance = user.role !== 'coordinator' && (await getSettings()).maintenanceMode;

    return NextResponse.json({
      success: true,
      maintenance,
      user: {
        user_id: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        skills: user.skills,
        is_active: user.is_active,
        is_approved: user.is_approved,
        must_change_password: user.must_change_password,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return fail('Failed to get user', 500);
  }
}
