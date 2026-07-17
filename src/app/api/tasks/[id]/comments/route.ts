import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskComments, createTaskComment, getUserById, logTaskActivity } from '@/lib/db';

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

    const comments = await getTaskComments(taskId);
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
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
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    const comment = await createTaskComment(taskId, session.userId, content.trim());
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
    }

    // Log activity
    await logTaskActivity(taskId, session.userId, 'commented', { comment_id: comment.id });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
  }
}
