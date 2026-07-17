import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, updateRow } from '@/lib/google-sheets';
import { SHEETS } from '@/lib/google-sheets';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    // Find task
    const tasks = await getSheetData(SHEETS.TASKS);
    const taskIndex = tasks.findIndex((row, index) => index > 0 && row[0] === taskId);
    
    if (taskIndex === -1) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const taskRow = tasks[taskIndex];

    // Check permission (team members can only update their own tasks)
    const users = await getSheetData(SHEETS.USERS);
    const currentUser = users.find((row, index) => index > 0 && row[0] === session.userId);
    
    if (currentUser?.[4] === 'team_member' && taskRow[3] !== session.userId) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    // Update status (column 9 = status)
    taskRow[9] = status;

    // Set completion date if completed (column 10 = completion_date)
    if (status === 'completed') {
      taskRow[10] = new Date().toISOString();
    }

    // Update timestamp (column 13 = updated_at)
    taskRow[13] = new Date().toISOString();

    await updateRow(SHEETS.TASKS, taskIndex, taskRow);

    return NextResponse.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update task status' }, { status: 500 });
  }
}
