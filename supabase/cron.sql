-- Scheduled jobs (Supabase pg_cron + pg_net). Run in the SQL editor AFTER the first
-- Vercel deploy. Before running, replace the two placeholders below:
--   YOUR-APP.vercel.app  -> your production domain
--   YOUR_CRON_SECRET     -> the same value as CRON_SECRET in Vercel's env vars
-- Re-running is safe: jobs are replaced by name.
-- Note: free Supabase projects pause after 7 days of inactivity, which stops these jobs.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Mark tasks overdue every 15 minutes.
select cron.unschedule(jobid) from cron.job where jobname = 'adse-mark-overdue';
select cron.schedule(
  'adse-mark-overdue',
  '*/15 * * * *',
  $$ update public.tasks
     set status = 'overdue'
     where status in ('pending', 'in_progress') and deadline < now() $$
);

-- Deadline reminders (7/3/1 days) + overdue alerts, daily at 03:30 UTC (09:00 IST).
select cron.unschedule(jobid) from cron.job where jobname = 'adse-reminders';
select cron.schedule(
  'adse-reminders',
  '30 3 * * *',
  $$ select net.http_post(
       url := 'https://YOUR-APP.vercel.app/api/cron/reminders',
       headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);

-- Mirror data to Google Sheets every hour (one-way, Supabase -> Sheets).
select cron.unschedule(jobid) from cron.job where jobname = 'adse-sheets-sync';
select cron.schedule(
  'adse-sheets-sync',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://YOUR-APP.vercel.app/api/sync',
       headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);

-- Inspect: select * from cron.job;  |  select * from cron.job_run_details order by start_time desc limit 10;
