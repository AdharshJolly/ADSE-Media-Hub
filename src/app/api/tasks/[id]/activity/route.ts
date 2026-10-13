import { NextRequest, NextResponse } from 'next/server';
import { getTaskActivity } from '@/lib/db';
import { authenticate, fail, getAccessibleTask } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    if (!(await getAccessibleTask(taskId, session))) return fail('Task not found', 404);

    const activity = await getTaskActivity(taskId);
    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Get activity error:', error);
    return fail('Failed to fetch activity', 500);
  }
}
