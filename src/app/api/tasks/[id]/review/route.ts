import { NextRequest, NextResponse } from 'next/server';
import {
  supabase,
  getTaskById,
  getTaskAssignees,
  setAssigneeStates,
  getReviewerIds,
  getRequestById,
  updateRequest,
  updateTask,
  logTaskActivity,
  createNotification,
  bustStats,
} from '@/lib/db';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { reviewActionSchema } from '@/lib/validation';

// Review workflow: assignees submit, coordinators / student heads approve or send back.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, reviewActionSchema);
    if (bad) return bad;

    const task = await getTaskById(taskId);
    if (!task) return fail('Task not found', 404);
    const assignees = await getTaskAssignees(taskId);
    const isStaff = STAFF_ROLES.includes(session.role);
    const note = (type: string, title: string, message: string) => (recipient_id: string) =>
      createNotification({ recipient_id, type, title, message, related_task_id: taskId, is_read: false });

    if (data.action === 'submit') {
      const me = assignees.find((a) => a.user_id === session.userId);
      if (!me) return fail('Only people assigned to this task can submit it', 403);
      if (task.status === 'pending') return fail('Start the task before submitting it', 400);
      if (task.status === 'in_review' || task.status === 'completed') return fail('Task is already submitted', 400);
      if (me.state === 'submitted') return fail('You already submitted your part', 400);

      if (!(await setAssigneeStates(taskId, [session.userId], 'submitted'))) return fail('Failed to submit', 500);
      const allIn = assignees.every((a) => a.user_id === session.userId || a.state === 'submitted');

      await logTaskActivity(taskId, session.userId, 'submitted', { all_submitted: allIn });
      if (allIn) {
        if (!(await updateTask(taskId, { status: 'in_review' }))) return fail('Failed to update task', 500);
        const reviewers = (await getReviewerIds()).filter((id) => id !== session.userId);
        await Promise.all(
          reviewers.map(note('review_requested', 'Ready for review', `"${task.title}" has been submitted and needs your review.`))
        );
      }
      return NextResponse.json({ success: true, status: allIn ? 'in_review' : task.status, waitingOn: assignees.length - assignees.filter((a) => a.state === 'submitted' || a.user_id === session.userId).length });
    }

    // approve / rework: reviewers only
    if (!isStaff) return fail('Permission denied', 403);
    // A submitted task that passes its deadline flips to overdue but stays reviewable.
    const awaitingReview =
      task.status === 'in_review' ||
      (task.status === 'overdue' && assignees.length > 0 && assignees.every((a) => a.state === 'submitted'));
    if (!awaitingReview) return fail('Task is not waiting for review', 400);

    if (data.action === 'approve') {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', completion_date: new Date().toISOString() })
        .eq('id', taskId)
        .in('status', ['in_review', 'overdue']); // lose the race gracefully if two reviewers click at once
      if (error) return fail('Failed to approve', 500);
      bustStats();
      await logTaskActivity(taskId, session.userId, 'approved', {});

      // Close the originating request once none of its tasks are still open
      const recipients = new Set<string>([task.created_by]);
      if (task.request_id) {
        const req = await getRequestById(task.request_id);
        if (req) {
          recipients.add(req.requestor_id);
          const { count } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('request_id', task.request_id)
            .neq('status', 'completed');
          if (count === 0) await updateRequest(req.id, { status: 'completed' });
        }
      }
      recipients.delete(session.userId);
      await Promise.all(
        [...recipients].map(note('status_update', 'Task completed', `"${task.title}" was reviewed and approved.`))
      );
      return NextResponse.json({ success: true, status: 'completed' });
    }

    // rework
    if (!data.note.trim()) return fail('Tell the team what needs to change', 400);
    const targets = (data.userIds?.length ? data.userIds : assignees.map((a) => a.user_id)).filter((id) =>
      assignees.some((a) => a.user_id === id)
    );
    if (targets.length === 0) return fail('Pick at least one assignee', 400);

    if (!(await setAssigneeStates(taskId, targets, 'needs_rework', data.note.trim()))) return fail('Failed to request rework', 500);
    if (!(await updateTask(taskId, { status: 'in_progress' }))) return fail('Failed to update task', 500);
    await logTaskActivity(taskId, session.userId, 'rework_requested', {
      note: data.note.trim(),
      assignee_names: assignees.filter((a) => targets.includes(a.user_id)).map((a) => a.name),
    });
    await Promise.all(
      targets
        .filter((id) => id !== session.userId)
        .map(note('rework_requested', 'Rework requested', `"${task.title}": ${data.note.trim().slice(0, 200)}`))
    );
    return NextResponse.json({ success: true, status: 'in_progress' });
  } catch (error) {
    console.error('Task review error:', error);
    return fail('Review action failed', 500);
  }
}
