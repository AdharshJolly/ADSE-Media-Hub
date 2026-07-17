'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  request_id: string | null;
  created_by: string;
  assigned_to: string;
  title: string;
  description: string;
  media_type: string;
  priority: string;
  deadline: string;
  status: string;
  completion_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, canManageTasks } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const taskId = params.id as string;

  const fetchTask = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const data = await response.json();
      if (data.success) {
        setTask(data.task);
        if (data.task.assigned_to) {
          const userRes = await fetch('/api/users');
          const userData = await userRes.json();
          if (userData.success) {
            const assigned = userData.users.find((u: User) => u.id === data.task.assigned_to);
            setAssignedUser(assigned || null);
          }
        }
      } else {
        toast.error('Task not found');
        router.push('/tasks');
      }
    } catch {
      toast.error('Failed to fetch task');
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  const fetchTeamMembers = useCallback(async () => {
    if (!canManageTasks) return;
    try {
      const response = await fetch('/api/users/team-members');
      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.teamMembers);
      }
    } catch {
      console.error('Failed to fetch team members');
    }
  }, [canManageTasks]);

  useEffect(() => {
    fetchTask();
    fetchTeamMembers();
  }, [fetchTask, fetchTeamMembers]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status updated');
        fetchTask();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (assignedTo: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Task assigned');
        fetchTask();
      } else {
        toast.error(data.error || 'Failed to assign task');
      }
    } catch {
      toast.error('Failed to assign task');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Task deleted');
        router.push('/tasks');
      } else {
        toast.error(data.error || 'Failed to delete task');
      }
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-500',
      in_progress: 'bg-primary/10 text-primary',
      completed: 'bg-emerald-500/10 text-emerald-500',
      overdue: 'bg-red-500/10 text-red-500',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-blue-500/10 text-blue-500',
      high: 'bg-orange-500/10 text-orange-500',
      urgent: 'bg-rose-500/10 text-rose-500',
    };
    return colors[priority] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Task not found</p>
        <Link href="/tasks" className="text-primary hover:underline mt-2 inline-block">
          Back to tasks
        </Link>
      </div>
    );
  }

  const daysRemaining = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tasks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to tasks
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-2">{task.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Description</h2>
            <p className="text-foreground whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>

          {/* Notes */}
          {task.notes && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h2>
              <p className="text-foreground whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Actions</h2>
            
            {/* Team member actions */}
            {user?.role === 'team_member' && task.assigned_to === user.user_id && task.status !== 'completed' && (
              <div className="flex gap-3">
                {task.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate('in_progress')}
                    disabled={updating}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Start Task
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            )}

            {/* Coordinator actions */}
            {canManageTasks && (
              <div className="space-y-4">
                {/* Assignment */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Assign to</label>
                  <select
                    value={task.assigned_to}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={updating}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  >
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  Delete Task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Deadline</dt>
                <dd className="text-sm font-medium text-foreground">
                  {format(new Date(task.deadline), 'MMM d, yyyy')}
                  {task.status !== 'completed' && (
                    <span className={`ml-2 text-xs ${
                      daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 3 ? 'text-orange-500' : 'text-muted-foreground'
                    }`}>
                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : daysRemaining === 0 ? 'Due today' : `${daysRemaining}d left`}
                    </span>
                  )}
                </dd>
              </div>
              {task.media_type && (
                <div>
                  <dt className="text-xs text-muted-foreground">Media Type</dt>
                  <dd className="text-sm font-medium text-foreground capitalize">{task.media_type.replace('_', ' ')}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="text-sm font-medium text-foreground">{format(new Date(task.created_at), 'MMM d, yyyy')}</dd>
              </div>
              {task.completion_date && (
                <div>
                  <dt className="text-xs text-muted-foreground">Completed</dt>
                  <dd className="text-sm font-medium text-foreground">{format(new Date(task.completion_date), 'MMM d, yyyy')}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Assigned To */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Assigned To</h2>
            {assignedUser ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold">
                  {assignedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{assignedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{assignedUser.role.replace('_', ' ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}
          </div>

          {/* Linked Request */}
          {task.request_id && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Linked Request</h2>
              <Link
                href={`/requests?highlight=${task.request_id}`}
                className="text-sm text-primary hover:underline"
              >
                View original request &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
