import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, appendRow, generateId } from '@/lib/google-sheets';
import { sendTaskAssignedEmail } from '@/lib/email';
import { SHEETS } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    const users = await getSheetData(SHEETS.USERS);
    const currentUser = users.find((row, index) => index > 0 && row[0] === session.userId);
    const userRole = currentUser?.[4];

    let tasks = await getSheetData(SHEETS.TASKS);
    
    // Skip header row
    tasks = tasks.slice(1);

    // Filter based on role
    if (userRole === 'team_member') {
      tasks = tasks.filter((row) => row[3] === session.userId);
    }

    // Apply filters
    if (status) {
      if (status === 'active') {
        tasks = tasks.filter((row) => row[9] !== 'completed');
      } else {
        tasks = tasks.filter((row) => row[9] === status);
      }
    }
    if (assignedTo) {
      tasks = tasks.filter((row) => row[3] === assignedTo);
    }

    // Map to objects
    const tasksData = tasks.map((row) => ({
      task_id: row[0],
      request_id: row[1],
      created_by: row[2],
      assigned_to: row[3],
      title: row[4],
      description: row[5],
      media_type: row[6],
      priority: row[7],
      deadline: row[8],
      status: row[9],
      completion_date: row[10],
      notes: row[11],
      created_at: row[12],
      updated_at: row[13],
    }));

    return NextResponse.json({ success: true, tasks: tasksData });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is coordinator or student head
    const users = await getSheetData(SHEETS.USERS);
    const currentUser = users.find((row, index) => index > 0 && row[0] === session.userId);
    
    if (!currentUser || (currentUser[4] !== 'coordinator' && currentUser[4] !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, assignedTo, title, description, mediaType, priority, deadline, notes } = body;

    if (!title || !assignedTo || !deadline) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if assigned user exists
    const assignedUser = users.find((row, index) => index > 0 && row[0] === assignedTo);
    if (!assignedUser) {
      return NextResponse.json({ success: false, error: 'Assigned user not found' }, { status: 404 });
    }

    // Generate task ID
    const taskId = generateId('TASK');
    const now = new Date().toISOString();

    // Add task to sheet
    await appendRow(SHEETS.TASKS, [
      taskId,
      requestId || '',
      session.userId,
      assignedTo,
      title,
      description || '',
      mediaType || '',
      priority || 'medium',
      deadline,
      'pending',
      '', // completion_date
      notes || '',
      now,
      now,
    ]);

    // Send notification email
    await sendTaskAssignedEmail(
      assignedUser[1], // email
      assignedUser[3], // name
      title,
      description || '',
      deadline,
      priority || 'medium'
    );

    return NextResponse.json({ success: true, taskId, message: 'Task created successfully' });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }
}
