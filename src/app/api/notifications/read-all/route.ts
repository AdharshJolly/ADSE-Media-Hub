import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markAllNotificationsRead } from '@/lib/db';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const success = await markAllNotificationsRead(session.userId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to mark notifications' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark notifications' }, { status: 500 });
  }
}
