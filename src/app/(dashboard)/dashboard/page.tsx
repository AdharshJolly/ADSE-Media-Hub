'use client';

import { useState, useEffect, useCallback, memo } from 'react';
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

// Memoized stat card component
const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  color,
  href,
  linkText,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors duration-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 ${color.replace('text-', 'bg-')}/10 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border/50">
        {href ? (
          <Link href={href} className={`text-xs font-medium ${color} hover:opacity-80 transition-opacity duration-200`}>
            {linkText} &rarr;
          </Link>
        ) : (
          <span className={`text-xs font-medium ${color}`}>{linkText}</span>
        )}
      </div>
    </div>
  );
});

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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Here&apos;s an overview of your media hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Tasks"
          value={stats?.taskStats?.total || 0}
          color="text-primary"
          href="/tasks"
          linkText="View all tasks"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />

        <StatCard
          title="In Progress"
          value={stats?.taskStats?.in_progress || 0}
          color="text-yellow-accent"
          linkText="Active work"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Completed"
          value={stats?.taskStats?.completed || 0}
          color="text-green-500"
          linkText="All done"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Overdue"
          value={stats?.taskStats?.overdue || 0}
          color="text-red-500"
          linkText="Action required"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        {canManageTasks && (
          <>
            <StatCard
              title="Pending Requests"
              value={stats?.requestStats?.pending || 0}
              color="text-orange-500"
              href="/requests"
              linkText="Review now"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />

            <StatCard
              title="Team Members"
              value={stats?.userStats?.teamMembers || 0}
              color="text-primary"
              href="/users"
              linkText="Manage team"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />

            <StatCard
              title="Pending Approvals"
              value={stats?.userStats?.pendingApproval || 0}
              color="text-purple-500"
              href="/users"
              linkText="Review"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              }
            />
          </>
        )}

        {canManageTasks && workload.length > 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Team Workload</h2>
            <div className="space-y-3">
              {workload.slice(0, 5).map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.total_tasks} total tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-yellow-accent/10 text-yellow-accent text-[10px] font-semibold rounded-md">
                      {member.in_progress} active
                    </span>
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-semibold rounded-md">
                      {member.completed} done
                    </span>
                    {member.overdue > 0 && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-semibold rounded-md">
                        {member.overdue} overdue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border/50">
              <Link href="/users" className="text-xs font-medium text-primary hover:text-accent transition-colors duration-200">
                View full team workload &rarr;
              </Link>
            </div>
          </div>
        )}

        <div className={`col-span-1 md:col-span-2 ${canManageTasks ? 'lg:col-span-2' : 'lg:col-span-4'} bg-card border border-border rounded-xl p-5`}>
          <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid gap-3">
            {canManageTasks && (
              <>
                <Link
                  href="/tasks/new"
                  className="group block p-4 bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 rounded-lg transition-colors duration-200"
                >
                  <span className="font-semibold text-primary text-sm flex items-center justify-between">
                    Create New Task
                    <span className="text-primary/60 group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Assign work to media team members</p>
                </Link>
                <Link
                  href="/users"
                  className="group block p-4 bg-accent/5 hover:bg-accent/10 border border-accent/10 hover:border-accent/20 rounded-lg transition-colors duration-200"
                >
                  <span className="font-semibold text-accent text-sm flex items-center justify-between">
                    Manage Users
                    <span className="text-accent/60 group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Approve registrations and adjust roles</p>
                </Link>
              </>
            )}
            <Link
              href="/requests/new"
              className="group block p-4 bg-yellow-accent/5 hover:bg-yellow-accent/10 border border-yellow-accent/10 hover:border-yellow-accent/20 rounded-lg transition-colors duration-200"
            >
              <span className="font-semibold text-yellow-accent text-sm flex items-center justify-between">
                Submit Request
                <span className="text-yellow-accent/60 group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
              </span>
              <p className="text-xs text-muted-foreground mt-1">Request media coverage or resources</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
