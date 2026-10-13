import { supabase } from './supabase';

// Strip characters that have meaning in PostgREST filter syntax.
export function cleanTerm(raw: string | null | undefined): string {
  return (raw || '').replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

const ids = (rows: Array<{ id?: string; task_id?: string }> | null, key: 'id' | 'task_id') =>
  Array.from(new Set((rows || []).map((r) => r[key]).filter(Boolean))) as string[];

// Everything a term can reach: people by name, tasks via their comments.
export async function resolveTerm(term: string) {
  const like = `%${term}%`;
  const [users, comments] = await Promise.all([
    supabase.from('users').select('id').ilike('name', like).limit(50),
    supabase.from('task_comments').select('task_id').ilike('content', like).limit(50),
  ]);
  return { userIds: ids(users.data, 'id'), commentTaskIds: ids(comments.data, 'task_id') };
}

// PostgREST .or() filter for tasks: title, description, notes, assignee name, comment text.
export async function taskSearchFilter(term: string): Promise<string> {
  const { userIds, commentTaskIds } = await resolveTerm(term);
  const parts = [`title.ilike.%${term}%`, `description.ilike.%${term}%`, `notes.ilike.%${term}%`];
  if (userIds.length) parts.push(`assigned_to.in.(${userIds.join(',')})`);
  if (commentTaskIds.length) parts.push(`id.in.(${commentTaskIds.join(',')})`);
  return parts.join(',');
}

// PostgREST .or() filter for requests: title, description, event, platform, requestor name.
export async function requestSearchFilter(term: string): Promise<string> {
  const { userIds } = await resolveTerm(term);
  const parts = [
    `title.ilike.%${term}%`,
    `description.ilike.%${term}%`,
    `event_name.ilike.%${term}%`,
    `target_platform.ilike.%${term}%`,
  ];
  if (userIds.length) parts.push(`requestor_id.in.(${userIds.join(',')})`);
  return parts.join(',');
}
