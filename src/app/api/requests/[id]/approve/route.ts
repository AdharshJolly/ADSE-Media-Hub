import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateRequest, getUserById, getRequestById, createTask } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);
    if (!currentUser || (currentUser.role !== 'coordinator' && currentUser.role !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { notes, assignedTo } = body;

    // Get the request details
    const requestData = await getRequestById(requestId);
    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    // Update request status
    const success = await updateRequest(requestId, {
      status: 'approved',
      coordinator_notes: notes || '',
    });

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to approve request' }, { status: 500 });
    }

    // Auto-create a task from the request
    // If assignedTo is provided, assign directly; otherwise create unassigned
    const task = await createTask({
      request_id: requestId,
      created_by: session.userId,
      assigned_to: assignedTo || session.userId, // Temporary: assign to self if no one specified
      title: requestData.title,
      description: requestData.description,
      media_type: requestData.media_type,
      priority: requestData.priority,
      deadline: requestData.deadline,
      status: assignedTo ? 'pending' : 'pending', // pending until assigned
      completion_date: null,
      notes: `Auto-created from request. ${notes || ''}`,
    });

    if (!task) {
      console.error('Failed to auto-create task from request');
      // Request was still approved, just task creation failed
      return NextResponse.json({ 
        success: true, 
        message: 'Request approved but failed to create task',
        taskCreated: false 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Request approved and task created',
      taskId: task.id,
      taskCreated: true 
    });
  } catch (error) {
    console.error('Approve request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve request' }, { status: 500 });
  }
}
