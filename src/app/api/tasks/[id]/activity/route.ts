import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskActivity } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const activity = await getTaskActivity(taskId);
    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Get activity error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 500 });
  }
}
