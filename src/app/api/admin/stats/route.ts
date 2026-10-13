import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';
import { authenticate, fail } from '@/lib/api';

export async function GET() {
  try {
    const { response } = await authenticate(['coordinator']);
    if (response) return response;

    const { taskStats, requestStats, userStats } = await getDashboardStats();

    const stats = {
      users: { total: userStats.total, active: userStats.active, pending: userStats.pendingApproval },
      tasks: { total: taskStats.total, active: taskStats.pending + taskStats.in_progress, completed: taskStats.completed },
      requests: { total: requestStats.total, pending: requestStats.pending, approved: requestStats.approved },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return fail('Failed to fetch stats', 500);
  }
}
