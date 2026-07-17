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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">Here&apos;s a quick overview of your media hub</p>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Tasks Card */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Total Tasks</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">{stats?.taskStats?.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
            <span>Overall tasks assigned</span>
            <span className="font-medium text-primary">View Tasks</span>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">In Progress</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">{stats?.taskStats?.in_progress || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-accent/10 text-yellow-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
            <span>Currently active work</span>
            <span className="font-medium text-yellow-accent">Track Active</span>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Completed</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">{stats?.taskStats?.completed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
            <span>Tasks successfully finalized</span>
            <span className="font-medium text-green-500">View Done</span>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Overdue</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">{stats?.taskStats?.overdue || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
            <span>Needs immediate attention</span>
            <span className="font-medium text-red-500">Action Required</span>
          </div>
        </div>

        {/* Request Stats Grid Row (for coordinators/heads) */}
        {canManageTasks && (
          <>
            {/* Pending Requests Card */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pending Requests</p>
                  <p className="text-3xl font-extrabold text-orange-500 mt-3 tracking-tight">{stats?.requestStats?.pending || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                <span>Awaiting review</span>
                <span className="font-medium text-orange-500">Review</span>
              </div>
            </div>

            {/* Approved Requests Card */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Approved Requests</p>
                  <p className="text-3xl font-extrabold text-green-500 mt-3 tracking-tight">{stats?.requestStats?.approved || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                <span>Ready to start</span>
                <span className="font-medium text-green-500">Details</span>
              </div>
            </div>

            {/* Team Members Card */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Team Members</p>
                  <p className="text-3xl font-extrabold text-blue-500 mt-3 tracking-tight">{stats?.userStats?.teamMembers || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                <span>Active media crew</span>
                <span className="font-medium text-blue-500">Manage</span>
              </div>
            </div>

            {/* Pending Approvals Card */}
            <div className="bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pending Approvals</p>
                  <p className="text-3xl font-extrabold text-purple-500 mt-3 tracking-tight">{stats?.userStats?.pendingApproval || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                <span>User signups pending</span>
                <span className="font-medium text-purple-500">Review Now</span>
              </div>
            </div>
          </>
        )}

        {/* Team Workload (for coordinators/heads) */}
        {canManageTasks && workload.length > 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 tracking-tight">Team Workload</h2>
              <div className="space-y-3.5">
                {workload.slice(0, 5).map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        <span>
                          {member.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.total_tasks} total tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-yellow-accent/10 text-yellow-accent text-[10px] font-semibold rounded-full border border-yellow-accent/20">
                        {member.in_progress} active
                      </span>
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-semibold rounded-full border border-green-500/20">
                        {member.completed} done
                      </span>
                      {member.overdue > 0 && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-semibold rounded-full border border-red-500/20 animate-pulse">
                          {member.overdue} overdue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 text-right">
              <Link href="/users" className="text-xs font-semibold text-primary hover:text-accent transition">
                View Full Team Workload &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Quick Links / Actions */}
        <div className={`col-span-1 md:col-span-2 ${canManageTasks ? 'lg:col-span-2' : 'lg:col-span-4'} bg-card border border-border rounded-2xl p-6 hover:border-yellow-accent/40 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between`}>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 tracking-tight">Quick Actions</h2>
            <div className={`grid gap-4 ${!canManageTasks ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
              {canManageTasks && (
                <>
                  <Link
                    href="/tasks/new"
                    className="group block w-full text-left p-4 bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 rounded-xl transition"
                  >
                    <span className="font-semibold text-primary text-sm flex items-center justify-between">
                      Create New Task
                      <span className="text-primary/70 group-hover:translate-x-1 transition duration-200">&rarr;</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Assign work to media team members</p>
                  </Link>
                  <Link
                    href="/users"
                    className="group block w-full text-left p-4 bg-accent/5 hover:bg-accent/10 border border-accent/10 hover:border-accent/20 rounded-xl transition"
                  >
                    <span className="font-semibold text-accent text-sm flex items-center justify-between">
                      Manage Users
                      <span className="text-accent/70 group-hover:translate-x-1 transition duration-200">&rarr;</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Approve registrations and adjust roles</p>
                  </Link>
                </>
              )}
              <Link
                href="/requests/new"
                className="group block w-full text-left p-4 bg-yellow-accent/5 hover:bg-yellow-accent/10 border border-yellow-accent/10 hover:border-yellow-accent/20 rounded-xl transition"
              >
                <span className="font-semibold text-yellow-accent text-sm flex items-center justify-between">
                  Submit Request
                  <span className="text-yellow-accent/70 group-hover:translate-x-1 transition duration-200">&rarr;</span>
                </span>
                <p className="text-xs text-muted-foreground mt-1">Request media coverage or resources</p>
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 text-right">
            <span className="text-xs text-muted-foreground">Select an option to proceed</span>
          </div>
        </div>

      </div>
    </div>
  );
}
