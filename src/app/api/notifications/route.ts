import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, updateRow } from '@/lib/google-sheets';
import { SHEETS } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let notifications = await getSheetData(SHEETS.NOTIFICATIONS);
    
    // Skip header row
    notifications = notifications.slice(1);

    // Filter for current user
    let userNotifications = notifications.filter((row) => row[1] === session.userId);

    // Filter unread only if requested
    if (unreadOnly) {
      userNotifications = userNotifications.filter((row) => row[6] === 'FALSE' || row[6] === 'false');
    }

    // Sort by created_at descending
    userNotifications.sort((a, b) => new Date(b[7]).getTime() - new Date(a[7]).getTime());

    // Map to objects
    const notificationsData = userNotifications.map((row) => ({
      notification_id: row[0],
      recipient_id: row[1],
      type: row[2],
      title: row[3],
      message: row[4],
      related_task_id: row[5],
      is_read: row[6] === 'TRUE' || row[6] === 'true',
      created_at: row[7],
    }));

    // Count unread
    const unreadCount = notifications
      .filter((row) => row[1] === session.userId && (row[6] === 'FALSE' || row[6] === 'false'))
      .length;

    return NextResponse.json({
      success: true,
      notifications: notificationsData,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Notification ID is required' }, { status: 400 });
    }

    // Find notification
    const notifications = await getSheetData(SHEETS.NOTIFICATIONS);
    const notifIndex = notifications.findIndex(
      (row, index) => index > 0 && row[0] === notificationId && row[1] === session.userId
    );

    if (notifIndex === -1) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    // Update is_read (column 6)
    const notifRow = notifications[notifIndex];
    notifRow[6] = 'TRUE';
    await updateRow(SHEETS.NOTIFICATIONS, notifIndex, notifRow);

    return NextResponse.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark notification' }, { status: 500 });
  }
}
