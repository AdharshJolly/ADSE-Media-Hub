-- ADSE Hub Database Schema for Supabase
-- Run this in the Supabase SQL Editor to set up your database

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
create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();

create trigger update_requests_updated_at before update on requests
  for each row execute function update_updated_at_column();

create trigger update_tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();
