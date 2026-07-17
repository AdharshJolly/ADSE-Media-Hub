import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, updateRow, SHEETS } from '@/lib/google-sheets';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const notifications = await getSheetData(SHEETS.NOTIFICATIONS);

    // Batch updates - collect all rows that need updating
    const updates: Promise<void>[] = [];
    for (let i = 1; i < notifications.length; i++) {
      if (notifications[i][1] === session.userId && (notifications[i][6] === 'FALSE' || notifications[i][6] === 'false')) {
        notifications[i][6] = 'TRUE';
        updates.push(updateRow(SHEETS.NOTIFICATIONS, i, notifications[i]));
      }
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark notifications' }, { status: 500 });
  }
}
