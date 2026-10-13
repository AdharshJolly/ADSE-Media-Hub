import { NextRequest, NextResponse } from 'next/server';
import { deleteTaskLink } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { authenticate, fail, STAFF_ROLES } from '@/lib/api';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: linkId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const { data: link } = await supabase.from('task_links').select('user_id').eq('id', linkId).maybeSingle();
    if (!link) return fail('Link not found', 404);

    if (link.user_id !== session.userId && !STAFF_ROLES.includes(session.role)) {
      return fail('Permission denied', 403);
    }

    const success = await deleteTaskLink(linkId);
    if (!success) return fail('Failed to delete link', 500);

    return NextResponse.json({ success: true, message: 'Link deleted' });
  } catch (error) {
    console.error('Delete link error:', error);
    return fail('Failed to delete link', 500);
  }
}
