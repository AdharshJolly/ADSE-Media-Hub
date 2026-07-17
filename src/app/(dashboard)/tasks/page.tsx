'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Task {
  task_id: string;
  title: string;
  description: string;
  media_type: string;
  priority: string;
  deadline: string;
  status: string;
  assigned_to: string;
}

export default function TasksPage() {
  const { user, canManageTasks } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '', mediaType: '' });

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      
      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [filter.status]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Task status updated');
        fetchTasks();
      }
    } catch {
      toast.error('Failed to update task status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
        {canManageTasks && (
          <Link
            href="/tasks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Task</span>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-4">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => {
            const daysRemaining = getDaysRemaining(task.deadline);
            return (
              <div
                key={task.task_id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-800 line-clamp-2">{task.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.media_type && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                      {task.media_type?.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {format(new Date(task.deadline), 'MMM d, yyyy')}
                  </div>
                  {task.status !== 'completed' && (
                    <span
                      className={`text-xs font-medium ${
                        daysRemaining < 0
                          ? 'text-red-600'
                          : daysRemaining <= 3
                          ? 'text-orange-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {daysRemaining < 0
                        ? `${Math.abs(daysRemaining)} days overdue`
                        : daysRemaining === 0
                        ? 'Due today'
                        : `${daysRemaining} days left`}
                    </span>
                  )}
                </div>
                
                {/* Action buttons for team members */}
                {user?.role === 'team_member' && task.assigned_to === user.user_id && task.status !== 'completed' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(task.task_id, 'in_progress')}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                      >
                        Start Task
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusUpdate(task.task_id, 'completed')}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 transition"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
