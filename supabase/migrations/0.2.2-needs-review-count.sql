-- 0.2.2: "Needs review" also counts tasks that went overdue after every assignee submitted.
-- Run once in the Supabase SQL editor. Safe to re-run.

create or replace function awaiting_review_task_ids() returns setof uuid
language sql stable as $$
  select t.id from tasks t
  where t.status = 'in_review'
     or (t.status = 'overdue'
         and exists (select 1 from task_assignees a where a.task_id = t.id)
         and not exists (select 1 from task_assignees a where a.task_id = t.id and a.state <> 'submitted'))
$$;

create or replace function get_dashboard_stats() returns json
language sql stable as $$
  select json_build_object(
    'taskStats', (select json_build_object(
      'total', count(*),
      'pending', count(*) filter (where status = 'pending'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'in_review', count(*) filter (where status = 'in_review'),
      'needs_review', (select count(*) from awaiting_review_task_ids()),
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

revoke execute on function awaiting_review_task_ids(), get_dashboard_stats() from public, anon, authenticated;
