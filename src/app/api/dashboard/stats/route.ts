import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, SHEETS, userHasRole } from '@/lib/google-sheets';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const [tasks, requests, users] = await Promise.all([
      getSheetData(SHEETS.TASKS),
      getSheetData(SHEETS.REQUESTS),
      getSheetData(SHEETS.USERS),
    ]);

    const allTasks = tasks.slice(1);
    const allRequests = requests.slice(1);
    const allUsers = users.slice(1);

    // Single pass through users for role counts
    let pendingApproval = 0;
    let active = 0;
    let coordinators = 0;
    let studentHeads = 0;
    let teamMembers = 0;
    let requestors = 0;

    for (const row of allUsers) {
      const role = row[4];
      const isActive = row[6] === 'TRUE' || row[6] === 'true';
      const isApproved = row[7] === 'TRUE' || row[7] === 'true';

      if (role === 'coordinator') coordinators++;
      else if (role === 'student_head') studentHeads++;
      else if (role === 'team_member') teamMembers++;
      else if (role === 'requestor') requestors++;

      if (!isApproved) pendingApproval++;
      else if (isActive) active++;
    }

    const taskStats = {
      total: allTasks.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    };

    // Single pass for task stats
    for (const row of allTasks) {
      const status = row[9];
      if (status === 'pending') taskStats.pending++;
      else if (status === 'in_progress') taskStats.in_progress++;
      else if (status === 'completed') taskStats.completed++;
      else if (status === 'overdue') taskStats.overdue++;
    }

    const requestStats = {
      total: allRequests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    // Single pass for request stats
    for (const row of allRequests) {
      const status = row[10];
      if (status === 'pending') requestStats.pending++;
      else if (status === 'approved') requestStats.approved++;
      else if (status === 'rejected') requestStats.rejected++;
      else if (status === 'completed') requestStats.completed++;
    }

    return NextResponse.json({
      success: true,
      taskStats,
      requestStats,
      userStats: {
        total: allUsers.length,
        pendingApproval,
        active,
        coordinators,
        studentHeads,
        teamMembers,
        requestors,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
