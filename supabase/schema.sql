-- ADSE Hub Database Schema for Supabase
-- Run this in the Supabase SQL Editor to set up your database.
-- To wipe everything first, run supabase/reset.sql, then this file.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('coordinator', 'student_head', 'requestor', 'team_member')),
  skills text default '',
  is_active boolean default true,
  is_approved boolean default false,
  must_change_password boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Requests table
create table if not exists requests (
  id uuid primary key default uuid_generate_v4(),
  requestor_id uuid references users(id) on delete cascade,
  title text not null,
  description text not null,
  media_type text not null check (media_type in ('graphic_design', 'photography', 'video_production')),
  event_name text default '',
  target_platform text default '',
  style_reference text default '',
  deadline timestamptz not null,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  coordinator_notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references requests(id) on delete set null,
  created_by uuid references users(id) on delete cascade,
  assigned_to uuid references users(id) on delete cascade,
  title text not null,
  description text default '',
  media_type text default '',
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  deadline timestamptz not null,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'overdue')),
  completion_date timestamptz,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notifications table
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_task_id uuid references tasks(id) on delete set null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_requests_requestor_id on requests(requestor_id);
create index if not exists idx_requests_status on requests(status);
create index if not exists idx_tasks_assigned_to on tasks(assigned_to);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_deadline on tasks(deadline);
create index if not exists idx_notifications_recipient_id on notifications(recipient_id);
create index if not exists idx_notifications_is_read on notifications(is_read);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();

drop trigger if exists update_requests_updated_at on requests;
create trigger update_requests_updated_at before update on requests
  for each row execute function update_updated_at_column();

drop trigger if exists update_tasks_updated_at on tasks;
create trigger update_tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();

-- Task Comments table
create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Task Activity table
create table if not exists task_activity (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- Task Links table
create table if not exists task_links (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  url text not null,
  title text not null default '',
  description text not null default '',
  created_at timestamptz default now()
);

-- Additional indexes for collaboration
create index if not exists idx_task_comments_task_id on task_comments(task_id);
create index if not exists idx_task_comments_created_at on task_comments(created_at);
create index if not exists idx_task_activity_task_id on task_activity(task_id);
create index if not exists idx_task_activity_created_at on task_activity(created_at);
create index if not exists idx_task_links_task_id on task_links(task_id);

-- Triggers for collaboration tables
drop trigger if exists update_task_comments_updated_at on task_comments;
create trigger update_task_comments_updated_at before update on task_comments
  for each row execute function update_updated_at_column();

-- Rate limiting for unauthenticated endpoints (forgot-password)
create table if not exists auth_rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_auth_rate_limits_key_time on auth_rate_limits (key, created_at);

-- Browser push subscriptions (one row per browser/device)
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user_id on push_subscriptions (user_id);

-- Admin-controlled flags (key -> boolean)
create table if not exists app_settings (
  key text primary key,
  value boolean not null,
  updated_at timestamptz not null default now()
);
insert into app_settings (key, value) values
  ('maintenanceMode', false),
  ('emailNotifications', true)
on conflict (key) do nothing;

-- Aggregates computed in Postgres so dashboards stay one fast round trip as data grows.
create or replace function get_dashboard_stats() returns json
language sql stable as $$
  select json_build_object(
    'taskStats', (select json_build_object(
      'total', count(*),
      'pending', count(*) filter (where status = 'pending'),
      'in_progress', count(*) filter (where status = 'in_progress'),
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
      count(t.id) filter (where t.status = 'completed') as completed,
      count(t.id) filter (where t.status = 'overdue') as overdue
    from users u left join tasks t on t.assigned_to = u.id
    where u.role = 'team_member' and u.is_active and u.is_approved
    group by u.id
  ) w
$$;

revoke execute on function get_dashboard_stats(), get_team_workload() from public, anon, authenticated;

-- Row Level Security: ON with NO policies = deny-all for the anon and authenticated
-- roles. The app only talks to the database from the server with the service-role
-- key (which bypasses RLS), so the public anon key can never read or write data.
alter table users enable row level security;
alter table requests enable row level security;
alter table tasks enable row level security;
alter table notifications enable row level security;
alter table task_comments enable row level security;
alter table task_activity enable row level security;
alter table task_links enable row level security;
alter table auth_rate_limits enable row level security;
alter table push_subscriptions enable row level security;
alter table app_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
