'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface Stats {
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

interface Workload {
  user_id: string;
  name: string;
  total_tasks: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

export default function DashboardPage() {
  const { user, canManageTasks } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, workloadRes] = await Promise.all([
        fetch('/api/dashboard/stats').then((r) => r.json()),
        canManageTasks ? fetch('/api/dashboard/workload').then((r) => r.json()) : Promise.resolve({ success: true, workload: [] }),
      ]);

      if (statsRes.success) setStats(statsRes);
      if (workloadRes.success) setWorkload(workloadRes.workload);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [canManageTasks]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name}!</h1>
          <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your media tasks</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.taskStats?.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.taskStats?.in_progress || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.taskStats?.completed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.taskStats?.overdue || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Request Stats (for coordinators/heads) */}
      {canManageTasks && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500">Pending Requests</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats?.requestStats?.pending || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500">Approved Requests</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats?.requestStats?.approved || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500">Team Members</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.userStats?.teamMembers || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.userStats?.pendingApproval || 0}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload (for coordinators/heads) */}
        {canManageTasks && workload.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Team Workload</h2>
            <div className="space-y-4">
              {workload.slice(0, 5).map((member) => (
                <div key={member.user_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {member.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.total_tasks} tasks</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      {member.in_progress} active
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {member.completed} done
                    </span>
                    {member.overdue > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        {member.overdue} overdue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {canManageTasks && (
              <>
                <Link
                  href="/tasks/new"
                  className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <span className="font-medium text-blue-800">Create New Task</span>
                  <p className="text-sm text-blue-600">Assign work to team members</p>
                </Link>
                <Link
                  href="/users"
                  className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                >
                  <span className="font-medium text-purple-800">Manage Users</span>
                  <p className="text-sm text-purple-600">Approve registrations</p>
                </Link>
              </>
            )}
            <Link
              href="/requests/new"
              className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
            >
              <span className="font-medium text-green-800">Submit Request</span>
              <p className="text-sm text-green-600">Request media work</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
