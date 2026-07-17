import { supabase } from './supabase';
export { supabase };
import type {
  User,
  Request,
  Task,
  Notification,
  Workload,
  DashboardStats,
  UserRole,
  TaskStatus,
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

  return !error;
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
    query = query.eq('assigned_to', filters.assigned_to);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Task[];
}

export async function getTasksPaginated(
  page: number,
  pageSize: number,
  filters?: { status?: TaskStatus | 'active'; assigned_to?: string }
): Promise<PaginatedResponse<Task>> {
  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters?.status) {
    if (filters.status === 'active') {
      query = query.neq('status', 'completed');
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  const { data, error, count } = await query;
  if (error || !data) {
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: data as Task[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
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

  const { data, error } = await query;
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

export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

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
  return data as Notification;
}

// ==================== Dashboard ====================

export async function getDashboardStats(): Promise<DashboardStats> {
  const [tasksRes, requestsRes, usersRes] = await Promise.all([
    supabase.from('tasks').select('status'),
    supabase.from('requests').select('status'),
    supabase.from('users').select('role, is_active, is_approved'),
  ]);

  const tasks = tasksRes.data || [];
  const requests = requestsRes.data || [];
  const users = usersRes.data || [];

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
  };

  const requestStats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const userStats = {
    total: users.length,
    pendingApproval: users.filter(u => !u.is_approved).length,
    active: users.filter(u => u.is_active && u.is_approved).length,
    coordinators: users.filter(u => u.role === 'coordinator').length,
    studentHeads: users.filter(u => u.role === 'student_head').length,
    teamMembers: users.filter(u => u.role === 'team_member').length,
    requestors: users.filter(u => u.role === 'requestor').length,
  };

  return { taskStats, requestStats, userStats };
}

export async function getTeamWorkload(): Promise<Workload[]> {
  const [tasksRes, usersRes] = await Promise.all([
    supabase.from('tasks').select('assigned_to, status'),
    supabase.from('users').select('id, name, email, skills')
      .eq('role', 'team_member')
      .eq('is_active', true)
      .eq('is_approved', true),
  ]);

  const tasks = tasksRes.data || [];
  const users = usersRes.data || [];

  const workloadMap = new Map<string, Workload>();

  for (const user of users) {
    workloadMap.set(user.id, {
      user_id: user.id,
      name: user.name,
      email: user.email,
      skills: user.skills,
      total_tasks: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    });
  }

  for (const task of tasks) {
    const member = workloadMap.get(task.assigned_to);
    if (member) {
      member.total_tasks++;
      if (task.status === 'pending') member.pending++;
      else if (task.status === 'in_progress') member.in_progress++;
      else if (task.status === 'completed') member.completed++;
      else if (task.status === 'overdue') member.overdue++;
    }
  }

  return Array.from(workloadMap.values())
    .sort((a, b) => b.total_tasks - a.total_tasks);
}
