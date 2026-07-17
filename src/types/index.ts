export interface User {
  user_id: string;
  email: string;
  name: string;
  role: 'coordinator' | 'student_head' | 'requestor' | 'team_member';
  skills: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface Request {
  request_id: string;
  requestor_id: string;
  title: string;
  description: string;
  media_type: 'graphic_design' | 'photography' | 'video_production';
  event_name: string;
  target_platform: string;
  style_reference: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  coordinator_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  task_id: string;
  request_id: string;
  created_by: string;
  assigned_to: string;
  title: string;
  description: string;
  media_type: 'graphic_design' | 'photography' | 'video_production';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  notification_id: string;
  recipient_id: string;
  type: 'task_assigned' | 'reminder_7day' | 'reminder_3day' | 'reminder_1day' | 'overdue' | 'status_update';
  title: string;
  message: string;
  related_task_id: string;
  is_read: boolean;
  created_at: string;
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

export interface TeamWorkload {
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}
