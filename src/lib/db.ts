import { supabase } from './supabase';
import { sendPushToUser } from './push';
import { taskSearchFilter } from './search';
import { after } from 'next/server';
export { supabase };
import type {
  User,
  Request,
  Task,
  Notification,
  Workload,
  DashboardStats,
  TaskComment,
  TaskActivity,
  TaskLink,
  TaskStatus,
  TaskAssignee,
  AssigneeState,
  RequestStatus,
  PaginatedResponse,
} from '@/types/database';

// ==================== Users ====================

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as User[];
}

export async function getTeamMembers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'team_member')
    .eq('is_active', true)
    .eq('is_approved', true)
    .order('name');

  if (error || !data) return [];
  return data as User[];
}

export async function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id);

  sessionUserCache.delete(id);
  return !error;
}

// Applies `updates` and increments token_version (revoking every existing session) as a
// compare-and-set on the version it read, so concurrent calls can't overwrite each other's
// bump. Returns the new version, or null if it kept losing the race or the user is gone.
export async function updateUserRevokingSessions(id: string, updates: Partial<User> = {}): Promise<number | null> {
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: current } = await supabase.from('users').select('token_version').eq('id', id).maybeSingle();
      if (!current) return null;
      const next = (current.token_version ?? 0) + 1;
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, token_version: next })
        .eq('id', id)
        .eq('token_version', current.token_version ?? 0)
        .select('id');
      if (error) return null;
      if (data && data.length > 0) return next;
    }
    return null;
  } finally {
    sessionUserCache.delete(id);
  }
}

// Every authenticated request needs the user row, which costs a database round trip.
// Cache it briefly per server instance. A role change or deactivation made on another
// instance can take up to SESSION_USER_TTL_MS to apply. Users who must change their
// password are never cached, so finishing the change takes effect immediately.
const SESSION_USER_TTL_MS = 30_000;
const sessionUserCache = new Map<string, { user: User; at: number }>();

// `tokenVersion` is the version in the caller's session token. A cached copy with a different
// version is stale (another instance changed the password), so it is refetched rather than
// trusted. Revoked OLD tokens can still pass from a stale cache for up to the TTL.
export async function getSessionUser(id: string, tokenVersion?: number): Promise<User | null> {
  const hit = sessionUserCache.get(id);
  if (hit && Date.now() - hit.at < SESSION_USER_TTL_MS && (tokenVersion === undefined || (hit.user.token_version ?? 0) === tokenVersion)) return hit.user;

  const user = await getUserById(id);
  if (user && !user.must_change_password) {
    if (sessionUserCache.size > 500) sessionUserCache.clear();
    sessionUserCache.set(id, { user, at: Date.now() });
  } else {
    sessionUserCache.delete(id);
  }
  return user;
}

// ==================== Requests ====================

export async function getRequests(filters?: { status?: RequestStatus; requestor_id?: string }): Promise<Request[]> {
  let query = supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.requestor_id) {
    query = query.eq('requestor_id', filters.requestor_id);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Request[];
}

export async function getRequestsPaginated(
  page: number,
  pageSize: number,
  filters?: { status?: RequestStatus; requestor_id?: string }
): Promise<PaginatedResponse<Request>> {
  let query = supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.requestor_id) {
    query = query.eq('requestor_id', filters.requestor_id);
  }

  const { data, error, count } = await query;
  if (error || !data) {
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: data as Request[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getRequestById(id: string): Promise<Request | null> {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Request;
}

export async function createRequest(request: Omit<Request, 'id' | 'created_at' | 'updated_at'>): Promise<Request | null> {
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .select()
    .single();

  if (error || !data) return null;
  return data as Request;
}

export async function updateRequest(id: string, updates: Partial<Request>): Promise<boolean> {
  const { error } = await supabase
    .from('requests')
    .update(updates)
    .eq('id', id);

  return !error;
}

// ==================== Tasks ====================

export async function getTasks(filters?: { status?: TaskStatus | 'active'; assigned_to?: string }): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    if (filters.status === 'active') {
      query = query.neq('status', 'completed');
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.assigned_to) {
    const ids = await getAssignedTaskIds(filters.assigned_to);
    if (ids.length === 0) return [];
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Task[];
}

export async function getTasksPaginated(
  page: number,
  pageSize: number,
  filters?: { status?: TaskStatus | 'active'; assigned_to?: string; request_ids?: string[]; search?: string }
): Promise<PaginatedResponse<Task>> {
  let query = supabase
    .from('tasks')
    .select('*, assignee:users!tasks_assigned_to_fkey(id, name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters?.search) {
    query = query.or(await taskSearchFilter(filters.search));
  }
  if (filters?.status) {
    if (filters.status === 'active') {
      query = query.neq('status', 'completed');
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.assigned_to) {
    const ids = await getAssignedTaskIds(filters.assigned_to);
    if (ids.length === 0) return { data: [], count: 0, page, pageSize, totalPages: 0 };
    query = query.in('id', ids);
  }

  if (filters?.request_ids) {
    if (filters.request_ids.length === 0) {
      return { data: [], count: 0, page, pageSize, totalPages: 0 };
    }
    query = query.in('request_id', filters.request_ids);
  }

  const { data, error, count } = await query;
  if (error || !data) {
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  const rows = data as Task[];
  const byTask = await getAssigneesForTasks(rows.map((t) => t.id));
  for (const t of rows) t.assignees = byTask.get(t.id) ?? [];

  return {
    data: rows,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ---- Task assignees (everyone working on a task; tasks.assigned_to is the lead) ----

export async function getAssignedTaskIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from('task_assignees').select('task_id').eq('user_id', userId);
  return (data ?? []).map((r) => r.task_id as string);
}

export async function getAssigneesForTasks(taskIds: string[]): Promise<Map<string, TaskAssignee[]>> {
  const out = new Map<string, TaskAssignee[]>();
  if (taskIds.length === 0) return out;
  const [{ data: rows }, { data: leads }] = await Promise.all([
    supabase
      .from('task_assignees')
      .select('task_id, user_id, state, submitted_at, rework_note, created_at, user:users!task_assignees_user_id_fkey(name)')
      .in('task_id', taskIds)
      .order('created_at', { ascending: true }),
    supabase.from('tasks').select('id, assigned_to').in('id', taskIds),
  ]);
  const leadOf = new Map((leads ?? []).map((t) => [t.id as string, t.assigned_to as string]));
  for (const r of rows ?? []) {
    const u = (Array.isArray(r.user) ? r.user[0] : r.user) as { name: string } | null;
    const list = out.get(r.task_id) ?? [];
    list.push({
      user_id: r.user_id,
      name: u?.name ?? 'Team member',
      state: r.state as AssigneeState,
      submitted_at: r.submitted_at,
      rework_note: r.rework_note ?? '',
      is_lead: leadOf.get(r.task_id) === r.user_id,
    });
    out.set(r.task_id, list);
  }
  // Lead first, then in assignment order
  for (const list of out.values()) list.sort((a, b) => Number(b.is_lead) - Number(a.is_lead));
  return out;
}

export async function getTaskAssignees(taskId: string): Promise<TaskAssignee[]> {
  return (await getAssigneesForTasks([taskId])).get(taskId) ?? [];
}

// Replaces the assignee set. The first id becomes the lead. People who stay keep their state.
export async function setTaskAssignees(taskId: string, userIds: string[]): Promise<boolean> {
  const ids = [...new Set(userIds)];
  const { data: existing } = await supabase.from('task_assignees').select('user_id').eq('task_id', taskId);
  const have = new Set((existing ?? []).map((r) => r.user_id as string));
  const toAdd = ids.filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !ids.includes(id));
  if (toAdd.length) {
    const { error } = await supabase.from('task_assignees').insert(toAdd.map((user_id) => ({ task_id: taskId, user_id })));
    if (error) return false;
  }
  if (toRemove.length) {
    const { error } = await supabase.from('task_assignees').delete().eq('task_id', taskId).in('user_id', toRemove);
    if (error) return false;
  }
  return updateTask(taskId, { assigned_to: ids[0] });
}

export async function setAssigneeStates(
  taskId: string,
  userIds: string[],
  state: AssigneeState,
  reworkNote = ''
): Promise<boolean> {
  if (userIds.length === 0) return true;
  const { error } = await supabase
    .from('task_assignees')
    .update({ state, submitted_at: state === 'submitted' ? new Date().toISOString() : null, rework_note: reworkNote })
    .eq('task_id', taskId)
    .in('user_id', userIds);
  return !error;
}

// Coordinators and student heads: the people who review submitted work.
export async function getReviewerIds(): Promise<string[]> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .in('role', ['coordinator', 'student_head'])
    .eq('is_active', true)
    .eq('is_approved', true);
  return (data ?? []).map((u) => u.id as string);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Task;
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error || !data) return null;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);

  return !error;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
  const updates: Partial<Task> = { status };
  if (status === 'completed') {
    updates.completion_date = new Date().toISOString();
  }
  return updateTask(id, updates);
}

// ==================== Notifications ====================

export async function getNotifications(recipientId: string, unreadOnly = false): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query.limit(100);
  if (error || !data) return [];
  return data as Notification[];
}

export async function getUnreadNotificationCount(recipientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: string, recipientId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('recipient_id', recipientId);

  return !error;
}

export async function markAllNotificationsRead(recipientId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);

  return !error;
}

export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error || !data) return null;

  // Browser push is best-effort; after() keeps it alive past the response on Vercel.
  const push = () =>
    sendPushToUser(notification.recipient_id, {
      title: notification.title,
      body: notification.message,
      url: notification.related_task_id ? '/tasks' : '/notifications',
    }).catch((e) => console.error('Push send error:', e));
  try {
    after(push);
  } catch {
    void push();
  }

  return data as Notification;
}

// ==================== Dashboard ====================

export async function getDashboardStats(): Promise<DashboardStats> {
  // One round trip; counting happens in Postgres (see get_dashboard_stats in schema.sql).
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error || !data) throw error ?? new Error('get_dashboard_stats returned no data');
  return data as DashboardStats;
}

export async function getTeamWorkload(): Promise<Workload[]> {
  const { data, error } = await supabase.rpc('get_team_workload');
  if (error) throw error;
  return (data ?? []) as Workload[];
}

// ==================== Task Comments ====================

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, user:users!task_comments_user_id_fkey(id, name, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as TaskComment[];
}

export async function createTaskComment(taskId: string, userId: string, content: string): Promise<TaskComment | null> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, user_id: userId, content })
    .select('*, user:users!task_comments_user_id_fkey(id, name, role)')
    .single();

  if (error || !data) return null;
  return data as TaskComment;
}

export async function updateTaskComment(commentId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('task_comments')
    .update({ content })
    .eq('id', commentId);

  return !error;
}

export async function deleteTaskComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  return !error;
}

// ==================== Task Activity ====================

export async function logTaskActivity(
  taskId: string,
  userId: string | null,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('task_activity')
    .insert({ task_id: taskId, user_id: userId, action, details: details || null });
}

export async function getTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from('task_activity')
    .select('*, user:users!task_activity_user_id_fkey(id, name, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as TaskActivity[];
}

// ==================== Task Links ====================

export async function getTaskLinks(taskId: string): Promise<TaskLink[]> {
  const { data, error } = await supabase
    .from('task_links')
    .select('*, user:users!task_links_user_id_fkey(id, name, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as TaskLink[];
}

export async function createTaskLink(
  taskId: string,
  userId: string,
  url: string,
  title: string,
  description: string
): Promise<TaskLink | null> {
  const { data, error } = await supabase
    .from('task_links')
    .insert({ task_id: taskId, user_id: userId, url, title, description })
    .select('*, user:users!task_links_user_id_fkey(id, name, role)')
    .single();

  if (error || !data) return null;
  return data as TaskLink;
}

export async function deleteTaskLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('task_links')
    .delete()
    .eq('id', linkId);

  return !error;
}
