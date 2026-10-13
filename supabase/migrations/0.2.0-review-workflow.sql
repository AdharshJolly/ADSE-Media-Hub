-- v0.2.0: review workflow (in_review status) + multiple assignees per task.
-- Safe to re-run. Run in the Supabase SQL editor BEFORE deploying v0.2.0.

-- 1. New task status.
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('pending', 'in_progress', 'in_review', 'completed', 'overdue'));

-- 2. One row per person working on a task (the lead included). tasks.assigned_to stays as the lead.
create table if not exists task_assignees (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  state text not null default 'working' check (state in ('working', 'submitted', 'needs_rework')),
  submitted_at timestamptz,
  rework_note text not null default '',
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index if not exists idx_task_assignees_user on task_assignees (user_id);

-- Backfill: every existing task gets its current assignee (completed tasks count as submitted).
insert into task_assignees (task_id, user_id, state, submitted_at)
select id, assigned_to, case when status = 'completed' then 'submitted' else 'working' end,
       case when status = 'completed' then coalesce(completion_date, now()) end
from tasks where assigned_to is not null
on conflict do nothing;

alter table task_assignees enable row level security;
revoke all on task_assignees from anon, authenticated;

-- 3. Stats now know about in_review; workload counts every assignee, not just the lead.
create or replace function get_dashboard_stats() returns json
language sql stable as $$
  select json_build_object(
    'taskStats', (select json_build_object(
      'total', count(*),
      'pending', count(*) filter (where status = 'pending'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'in_review', count(*) filter (where status = 'in_review'),
      'completed', count(*) filter (where status = 'completed'),
      'overdue', count(*) filter (where status = 'overdue')) from tasks),
    'requestStats', (select json_build_object(
      'total', count(*),
      'pending', count(*) filter (where status = 'pending'),
      'approved', count(*) filter (where status = 'approved'),
      'rejected', count(*) filter (where status = 'rejected'),
      'completed', count(*) filter (where status = 'completed')) from requests),
    'userStats', (select json_build_object(
      'total', count(*),
      'pendingApproval', count(*) filter (where not is_approved),
      'awaitingFirstLogin', count(*) filter (where must_change_password and is_active),
      'active', count(*) filter (where is_active and is_approved),
      'coordinators', count(*) filter (where role = 'coordinator'),
      'studentHeads', count(*) filter (where role = 'student_head'),
      'teamMembers', count(*) filter (where role = 'team_member'),
      'requestors', count(*) filter (where role = 'requestor')) from users)
  )
$$;

create or replace function get_team_workload() returns json
language sql stable as $$
  select coalesce(json_agg(w order by w.total_tasks desc), '[]'::json) from (
    select u.id as user_id, u.name, u.email, u.skills,
      count(t.id) as total_tasks,
      count(t.id) filter (where t.status = 'pending') as pending,
      count(t.id) filter (where t.status = 'in_progress') as in_progress,
      count(t.id) filter (where t.status = 'in_review') as in_review,
      count(t.id) filter (where t.status = 'completed') as completed,
      count(t.id) filter (where t.status = 'overdue') as overdue
    from users u
      left join task_assignees ta on ta.user_id = u.id
      left join tasks t on t.id = ta.task_id
    where u.role = 'team_member' and u.is_active and u.is_approved
    group by u.id
  ) w
$$;

revoke execute on function get_dashboard_stats(), get_team_workload() from public, anon, authenticated;
