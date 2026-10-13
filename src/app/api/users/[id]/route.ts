import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/lib/db';
import { authenticate, fail, parseBody } from '@/lib/api';
import { updateUserSchema } from '@/lib/validation';
import { supabase } from '@/lib/supabase';

// Coordinator renames a person.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { response } = await authenticate(['coordinator']);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, updateUserSchema);
    if (bad) return bad;

    if (!(await getUserById(id))) return fail('User not found', 404);
    if (!(await updateUser(id, { name: data.name }))) return fail('Failed to update user', 500);

    return NextResponse.json({ success: true, name: data.name });
  } catch (error) {
    console.error('Update user error:', error);
    return fail('Failed to update user', 500);
  }
}

// Coordinator permanently removes a person. Tasks and requests cascade-delete with
// their owner, so anyone with work history must be deactivated instead.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, response } = await authenticate(['coordinator']);
    if (response) return response;

    if (id === session.userId) return fail('You cannot delete yourself', 400);
    if (!(await getUserById(id))) return fail('User not found', 404);

    const counts = await Promise.all([
      supabase.from('requests').select('id', { count: 'exact', head: true }).eq('requestor_id', id),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).or(`created_by.eq.${id},assigned_to.eq.${id}`),
      supabase.from('task_assignees').select('task_id', { count: 'exact', head: true }).eq('user_id', id),
    ]);
    if (counts.some((c) => c.error)) return fail('Failed to delete user', 500);
    if (counts.some((c) => (c.count ?? 0) > 0)) {
      return fail('This person has requests or tasks on record, so deleting them would erase that work. Deactivate them instead.', 409);
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return fail('Failed to delete user', 500);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return fail('Failed to delete user', 500);
  }
}
