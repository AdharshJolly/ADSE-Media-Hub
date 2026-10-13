-- 0.2.1: tasks waiting for review now flip to overdue like any other task.
-- Only changes the overdue job's command; the reminders job (with your CRON_SECRET) is untouched.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'adse-mark-overdue'),
  command := $$ update public.tasks
     set status = 'overdue'
     where status in ('pending', 'in_progress', 'in_review') and deadline < now() $$
);
