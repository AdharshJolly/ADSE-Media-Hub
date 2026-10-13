import { NextRequest, NextResponse } from 'next/server';
import { updateTaskComment, deleteTaskComment } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { commentSchema } from '@/lib/validation';
import type { Session } from '@/lib/auth';

async function canModify(commentId: string, session: Session): Promise<'ok' | 'missing' | 'denied'> {
  const { data: comment } = await supabase.from('task_comments').select('user_id').eq('id', commentId).maybeSingle();
  if (!comment) return 'missing';
  const allowed = comment.user_id === session.userId || STAFF_ROLES.includes(session.role);
  return allowed ? 'ok' : 'denied';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, commentSchema);
    if (bad) return bad;

    const access = await canModify(commentId, session);
    if (access === 'missing') return fail('Comment not found', 404);
    if (access === 'denied') return fail('Permission denied', 403);

    const success = await updateTaskComment(commentId, data.content);
    if (!success) return fail('Failed to update comment', 500);

    return NextResponse.json({ success: true, message: 'Comment updated' });
  } catch (error) {
    console.error('Update comment error:', error);
    return fail('Failed to update comment', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const access = await canModify(commentId, session);
    if (access === 'missing') return fail('Comment not found', 404);
    if (access === 'denied') return fail('Permission denied', 403);

    const success = await deleteTaskComment(commentId);
    if (!success) return fail('Failed to delete comment', 500);

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return fail('Failed to delete comment', 500);
  }
}
