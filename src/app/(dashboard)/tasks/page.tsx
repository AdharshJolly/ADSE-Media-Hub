'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Task } from '@/types/database';

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export default function TasksPage() {
  const { user, canManageTasks } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const debouncedStatus = useDebounce(statusFilter, 300);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedStatus) params.set('status', debouncedStatus);
      params.set('page', page.toString());
      params.set('pageSize', '12');

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
        setTotalPages(data.totalPages);
        setTotalCount(data.count);
      }
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [debouncedStatus, page]);

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
    fetchTasks();
    fetchTeamMembers();
  }, [fetchTasks, fetchTeamMembers]);

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    const originalTasks = [...tasks];
    
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
    ));

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!data.success) {
        setTasks(originalTasks);
        toast.error(data.error || 'Failed to update task status');
      } else {
        toast.success('Task status updated');
      }
    } catch {
      setTasks(originalTasks);
      toast.error('Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleAssign = async (taskId: string, assignedTo: string) => {
    setAssigningTaskId(taskId);
    const originalTasks = [...tasks];
    
    // Optimistic update
    const member = teamMembers.find(m => m.id === assignedTo);
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, assigned_to: assignedTo } : t
    ));

    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      const data = await response.json();
      if (!data.success) {
        setTasks(originalTasks);
        toast.error(data.error || 'Failed to assign task');
      } else {
        toast.success(`Task assigned to ${member?.name || 'member'}`);
      }
    } catch {
      setTasks(originalTasks);
      toast.error('Failed to assign task');
    } finally {
      setAssigningTaskId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      in_progress: 'bg-primary/10 text-primary border border-primary/20',
      completed: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      overdue: 'bg-red-500/10 text-red-500 border border-red-500/20',
    };
    return colors[status] || 'bg-muted text-muted-foreground border border-border';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-muted/50 text-muted-foreground border border-border/50',
      medium: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
      high: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
      urgent: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    };
    return colors[priority] || 'bg-muted/50 text-muted-foreground border border-border/50';
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Check if task needs assignment (created by coordinator, assigned to themselves)
  const needsAssignment = (task: Task) => {
    return canManageTasks && task.assigned_to === task.created_by && task.status === 'pending';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount} total tasks</p>
        </div>
        {canManageTasks && (
          <Link
            href="/tasks/new"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 shadow-sm">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tasks.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-card border border-border rounded-xl shadow-sm">
                <p className="text-muted-foreground text-sm">No tasks found</p>
              </div>
            ) : (
              tasks.map((task) => {
                const daysRemaining = getDaysRemaining(task.deadline);
                const isUpdating = updatingTaskId === task.id;
                const isAssigning = assigningTaskId === task.id;
                const unassigned = needsAssignment(task);
                return (
                  <div
                    key={task.id}
                    className={`bg-card border rounded-xl p-5 transition-colors duration-200 shadow-sm flex flex-col justify-between ${
                      unassigned ? 'border-yellow-accent/50 bg-yellow-accent/5' : 'border-border hover:border-border/80'
                    } ${isUpdating || isAssigning ? 'opacity-60' : ''}`}
                  >
                    <div>
                      {unassigned && (
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-yellow-accent">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Needs Assignment
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
                          {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${getStatusColor(task.status)}`}>
                          {task.status?.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {task.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.media_type && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                            {task.media_type?.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center text-muted-foreground">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {format(new Date(task.deadline), 'MMM d, yyyy')}
                        </div>
                        {task.status !== 'completed' && (
                          <span
                            className={`font-semibold ${
                              daysRemaining < 0
                                ? 'text-red-500'
                                : daysRemaining <= 3
                                ? 'text-orange-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {daysRemaining < 0
                              ? `${Math.abs(daysRemaining)}d overdue`
                              : daysRemaining === 0
                              ? 'Due today'
                              : `${daysRemaining}d left`}
                          </span>
                        )}
                      </div>

                      {/* Assignment UI for coordinators */}
                      {unassigned && (
                        <div className="mt-3">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssign(task.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            disabled={isAssigning}
                            className="w-full px-3 py-2 bg-background border border-yellow-accent/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-accent focus:border-yellow-accent disabled:opacity-50 cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Select team member...</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Action buttons for team members */}
                      {user?.role === 'team_member' && task.assigned_to === user.user_id && task.status !== 'completed' && !unassigned && (
                        <div className="mt-3 flex space-x-2">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                              disabled={isUpdating}
                              className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 cursor-pointer text-center"
                            >
                              Start Task
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(task.id, 'completed')}
                              disabled={isUpdating}
                              className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 cursor-pointer text-center"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
