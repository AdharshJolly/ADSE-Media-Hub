import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, getUnreadNotificationCount, markNotificationRead } from '@/lib/db';
import { authenticate, fail, parseBody } from '@/lib/api';
import { notificationIdSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await getNotifications(session.userId, unreadOnly);
    const unreadCount = await getUnreadNotificationCount(session.userId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return fail('Failed to fetch notifications', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, notificationIdSchema);
    if (bad) return bad;

    // Scoped to the recipient so users can only mark their own notifications
    const success = await markNotificationRead(data.notificationId, session.userId);
    if (!success) return fail('Failed to mark notification', 500);

    return NextResponse.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return fail('Failed to mark notification', 500);
  }
}
