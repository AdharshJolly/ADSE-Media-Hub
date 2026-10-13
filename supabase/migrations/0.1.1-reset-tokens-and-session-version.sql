-- v0.1.1: emailed reset links (replaces overwrite-on-request) and session invalidation.
-- Safe to re-run. Run in the Supabase SQL editor BEFORE deploying v0.1.1.

-- Bumped on password change/reset; JWTs carrying an older value stop working.
alter table users add column if not exists token_version integer not null default 0;

-- One-time password reset links. Only a SHA-256 hash of the token is stored.
create table if not exists password_reset_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_password_reset_tokens_user on password_reset_tokens (user_id);
