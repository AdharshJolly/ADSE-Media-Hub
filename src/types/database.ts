export type UserRole = 'coordinator' | 'student_head' | 'requestor' | 'team_member';
export type MediaType = 'graphic_design' | 'photography' | 'video_production';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  role: UserRole;
  skills: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  requestor_id: string;
  title: string;
  description: string;
  media_type: MediaType;
  event_name: string;
  target_platform: string;
  style_reference: string;
  deadline: string;
  priority: Priority;
  status: RequestStatus;
  coordinator_notes: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  requestor?: User;
}

export interface Task {
  id: string;
  request_id: string | null;
  created_by: string;
  assigned_to: string;
  title: string;
  description: string;
  media_type: string;
  priority: Priority;
  deadline: string;
  status: TaskStatus;
  completion_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee?: User;
  creator?: User;
  request?: Request;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_task_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Workload {
  user_id: string;
  name: string;
  email: string;
  skills: string;
  total_tasks: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

export interface DashboardStats {
  taskStats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  requestStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  userStats: {
    total: number;
    pendingApproval: number;
    active: number;
    coordinators: number;
    studentHeads: number;
    teamMembers: number;
    requestors: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
