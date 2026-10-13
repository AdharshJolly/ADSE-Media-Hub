import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { fail } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/db';
import { sendDeadlineReminderEmail, sendTaskOverdueEmail } from '@/lib/email';

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

    // Safety net in case the SQL overdue job is not installed.
    await supabase
      .from('tasks')
      .update({ status: 'overdue' })
      .in('status', ['pending', 'in_progress'])
      .lt('deadline', now.toISOString());

    const horizon = new Date(now.getTime() + (Math.max(...REMINDER_DAYS) + 1) * DAY_MS).toISOString();
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, deadline, status, assigned_to')
      .in('status', ['pending', 'in_progress', 'overdue'])
      .lt('deadline', horizon)
      .not('assigned_to', 'is', null);
    if (error) throw error;
    if (!tasks?.length) return NextResponse.json({ success: true, reminders: 0, overdue: 0 });

    const assigneeIds = [...new Set(tasks.map((t) => t.assigned_to as string))];
    const [{ data: users }, { data: existing }] = await Promise.all([
      supabase.from('users').select('id, name, email, is_active').in('id', assigneeIds),
      supabase
        .from('notifications')
        .select('recipient_id, related_task_id, type')
        .in('related_task_id', tasks.map((t) => t.id))
        .like('type', 'reminder_%'),
    ]);
    const userById = new Map((users ?? []).map((u) => [u.id as string, u]));
    const sent = new Set((existing ?? []).map((n) => `${n.related_task_id}:${n.type}`));

    let reminders = 0;
    let overdue = 0;

    for (const task of tasks) {
      const user = userById.get(task.assigned_to as string);
      if (!user?.is_active) continue;

      const deadline = new Date(task.deadline as string);
      const when = deadline.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

      if (task.status === 'overdue') {
        const type = 'reminder_overdue';
        if (sent.has(`${task.id}:${type}`)) continue;
        const daysOverdue = Math.max(1, Math.floor((now.getTime() - deadline.getTime()) / DAY_MS));
        await createNotification({
          recipient_id: user.id,
          type,
          title: 'Task overdue',
          message: `"${task.title}" was due on ${when}.`,
          related_task_id: task.id,
          is_read: false,
        });
        await sendTaskOverdueEmail(user.email, user.name, task.title, when, daysOverdue);
        overdue++;
        continue;
      }

      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
      if (!REMINDER_DAYS.includes(daysLeft)) continue;
      const type = `reminder_${daysLeft}d`;
      if (sent.has(`${task.id}:${type}`)) continue;

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

    return NextResponse.json({ success: true, reminders, overdue });
  } catch (error) {
    console.error('Cron reminders error:', error);
    return fail('Reminder run failed', 500);
  }
}
