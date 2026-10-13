import { NextRequest, NextResponse } from 'next/server';
import { updateUser, getUserById } from '@/lib/db';
import { authenticate, fail, STAFF_ROLES } from '@/lib/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { session, response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    if (userId === session.userId) return fail('Cannot deactivate yourself', 400);

    const target = await getUserById(userId);
    if (!target) return fail('User not found', 404);

    // Only coordinators may deactivate other coordinators
    if (target.role === 'coordinator' && session.role !== 'coordinator') {
      return fail('Permission denied', 403);
    }

    const success = await updateUser(userId, { is_active: false });
    if (!success) return fail('Failed to deactivate user', 500);

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    return fail('Failed to deactivate user', 500);
  }
}
