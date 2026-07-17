import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateTaskComment, deleteTaskComment, getUserById, supabase } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    // Check ownership
    const { data: comment } = await supabase.from('task_comments').select('user_id').eq('id', commentId).single();
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    const currentUser = await getUserById(session.userId);
    const isOwner = comment.user_id === session.userId;
    const isCoordinator = currentUser?.role === 'coordinator' || currentUser?.role === 'student_head';

    if (!isOwner && !isCoordinator) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const success = await updateTaskComment(commentId, content.trim());
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to update comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Comment updated' });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Check ownership
    const { data: comment } = await supabase.from('task_comments').select('user_id').eq('id', commentId).single();
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    const currentUser = await getUserById(session.userId);
    const isOwner = comment.user_id === session.userId;
    const isCoordinator = currentUser?.role === 'coordinator' || currentUser?.role === 'student_head';

    if (!isOwner && !isCoordinator) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const success = await deleteTaskComment(commentId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
  }
}
