import { NextResponse } from 'next/server';
import { markAllNotificationsRead } from '@/lib/db';
import { authenticate, fail } from '@/lib/api';

export async function POST() {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const success = await markAllNotificationsRead(session.userId);
    if (!success) return fail('Failed to mark notifications', 500);

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return fail('Failed to mark notifications', 500);
  }
}
