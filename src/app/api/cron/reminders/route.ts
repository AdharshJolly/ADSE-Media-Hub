import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { fail } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { createNotification, getReviewerIds } from '@/lib/db';
import { sendDeadlineReminderEmail, sendTaskOverdueEmail, sendTaskOverdueStaffEmail } from '@/lib/email';

export const maxDuration = 60;

const REMINDER_DAYS = [7, 3, 1];
const DAY_MS = 86_400_000;

function authorized(request: NextRequest): boolean {
  const expected = env.CRON_SECRET;
  const given = request.headers.get('x-cron-secret');
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called daily by pg_cron + pg_net. Idempotent: each (task, milestone) notifies once.
export async function POST(request: NextRequest) {
  if (!authorized(request)) return fail('Unauthorized', 401);

  try {
    const now = new Date();

    // Safety net in case the SQL overdue job is not installed. Tasks in review go overdue too.
    await supabase
      .from('tasks')
      .update({ status: 'overdue' })
      .in('status', ['pending', 'in_progress', 'in_review'])
      .lt('deadline', now.toISOString());

    const horizon = new Date(now.getTime() + (Math.max(...REMINDER_DAYS) + 1) * DAY_MS).toISOString();
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, deadline, status, assigned_to')
      .in('status', ['pending', 'in_progress', 'overdue'])
      .lt('deadline', horizon);
    if (error) throw error;
    if (!tasks?.length) return NextResponse.json({ success: true, reminders: 0, overdue: 0 });

    const taskIds = tasks.map((t) => t.id as string);
    const { data: links } = await supabase.from('task_assignees').select('task_id, user_id').in('task_id', taskIds);
    const assigneesOf = new Map<string, string[]>();
    for (const l of links ?? []) {
      const list = assigneesOf.get(l.task_id as string) ?? [];
      list.push(l.user_id as string);
      assigneesOf.set(l.task_id as string, list);
    }
    // Tasks without assignee rows fall back to the single assigned_to
    for (const t of tasks) {
      if (!assigneesOf.has(t.id as string) && t.assigned_to) assigneesOf.set(t.id as string, [t.assigned_to as string]);
    }

    const reviewerIds = await getReviewerIds();
    const userIds = [...new Set([...assigneesOf.values()].flat().concat(reviewerIds))];
    const [{ data: users }, { data: existing }] = await Promise.all([
      supabase.from('users').select('id, name, email, is_active').in('id', userIds),
      supabase
        .from('notifications')
        .select('recipient_id, related_task_id, type')
        .in('related_task_id', taskIds)
        .like('type', 'reminder_%'),
    ]);
    const userById = new Map((users ?? []).map((u) => [u.id as string, u]));
    const sent = new Set((existing ?? []).map((n) => `${n.related_task_id}:${n.type}:${n.recipient_id}`));

    let reminders = 0;
    let overdue = 0;

    for (const task of tasks) {
      const ids = assigneesOf.get(task.id as string) ?? [];
      const assignees = ids.map((id) => userById.get(id)).filter((u) => u?.is_active);
      if (assignees.length === 0) continue;

      const deadline = new Date(task.deadline as string);
      const when = deadline.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

      if (task.status === 'overdue') {
        const type = 'reminder_overdue';
        const daysOverdue = Math.max(1, Math.floor((now.getTime() - deadline.getTime()) / DAY_MS));
        const names = assignees.map((u) => u!.name).join(', ');
        // Assignees and every coordinator / student head, each notified once per task
        const recipients = [...new Set([...ids, ...reviewerIds])];
        for (const rid of recipients) {
          const user = userById.get(rid);
          if (!user?.is_active || sent.has(`${task.id}:${type}:${rid}`)) continue;
          const isAssignee = ids.includes(rid);
          await createNotification({
            recipient_id: rid,
            type,
            title: 'Task overdue',
            message: isAssignee ? `"${task.title}" was due on ${when}.` : `"${task.title}" (${names}) was due on ${when}.`,
            related_task_id: task.id,
            is_read: false,
          });
          if (isAssignee) await sendTaskOverdueEmail(user.email, user.name, task.title, when, daysOverdue);
          else await sendTaskOverdueStaffEmail(user.email, task.title, names, when, daysOverdue);
          overdue++;
        }
        continue;
      }

      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
      if (!REMINDER_DAYS.includes(daysLeft)) continue;
      const type = `reminder_${daysLeft}d`;

      for (const user of assignees) {
        if (!user || sent.has(`${task.id}:${type}:${user.id}`)) continue;
        await createNotification({
          recipient_id: user.id,
          type,
          title: daysLeft === 1 ? 'Task due tomorrow' : `Task due in ${daysLeft} days`,
          message: `"${task.title}" is due on ${when}.`,
          related_task_id: task.id,
          is_read: false,
        });
        await sendDeadlineReminderEmail(user.email, user.name, task.title, when, daysLeft);
        reminders++;
      }
    }

    return NextResponse.json({ success: true, reminders, overdue });
  } catch (error) {
    console.error('Cron reminders error:', error);
    return fail('Reminder run failed', 500);
  }
}
