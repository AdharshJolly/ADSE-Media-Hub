import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteTaskLink, getUserById, supabase } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: linkId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Check ownership
    const { data: link } = await supabase.from('task_links').select('user_id').eq('id', linkId).single();
    if (!link) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    const currentUser = await getUserById(session.userId);
    const isOwner = link.user_id === session.userId;
    const isCoordinator = currentUser?.role === 'coordinator' || currentUser?.role === 'student_head';

    if (!isOwner && !isCoordinator) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const success = await deleteTaskLink(linkId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to delete link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Link deleted' });
  } catch (error) {
    console.error('Delete link error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete link' }, { status: 500 });
  }
}
