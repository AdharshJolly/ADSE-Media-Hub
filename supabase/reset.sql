-- DESTRUCTIVE: deletes ALL app data and tables. Test data only.
-- Run this, then run schema.sql, then `npm run seed:admin`.
drop table if exists password_reset_tokens cascade;
drop table if exists app_settings cascade;
drop table if exists push_subscriptions cascade;
drop table if exists auth_rate_limits cascade;
drop table if exists task_assignees cascade;
drop table if exists task_links cascade;
drop table if exists task_activity cascade;
drop table if exists task_comments cascade;
drop table if exists notifications cascade;
drop table if exists tasks cascade;
drop table if exists requests cascade;
drop table if exists users cascade;
drop function if exists awaiting_review_task_ids() cascade;
drop function if exists get_dashboard_stats() cascade;
drop function if exists get_team_workload() cascade;
drop function if exists update_updated_at_column() cascade;

-- pg_cron jobs (if you created them from cron.sql) are left in place: they only
-- reference table names, so they keep working once schema.sql recreates the tables.
