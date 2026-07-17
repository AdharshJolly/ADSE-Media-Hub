import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData } from '@/lib/google-sheets';
import { SHEETS } from '@/lib/google-sheets';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Get all data
    const [tasks, requests, users] = await Promise.all([
      getSheetData(SHEETS.TASKS),
      getSheetData(SHEETS.REQUESTS),
      getSheetData(SHEETS.USERS),
    ]);

    // Skip header rows
    const allTasks = tasks.slice(1);
    const allRequests = requests.slice(1);
    const allUsers = users.slice(1);

    // Count tasks by status
    const taskStats = {
      total: allTasks.length,
      pending: allTasks.filter((row) => row[9] === 'pending').length,
      in_progress: allTasks.filter((row) => row[9] === 'in_progress').length,
      completed: allTasks.filter((row) => row[9] === 'completed').length,
      overdue: allTasks.filter((row) => row[9] === 'overdue').length,
    };

    // Count requests by status
    const requestStats = {
      total: allRequests.length,
      pending: allRequests.filter((row) => row[10] === 'pending').length,
      approved: allRequests.filter((row) => row[10] === 'approved').length,
      rejected: allRequests.filter((row) => row[10] === 'rejected').length,
      completed: allRequests.filter((row) => row[10] === 'completed').length,
    };

    // Count users by role and status
    const userStats = {
      total: allUsers.length,
      pendingApproval: allUsers.filter((row) => row[7] === 'FALSE' || row[7] === 'false').length,
      active: allUsers.filter((row) => row[6] === 'TRUE' && row[7] === 'TRUE').length,
      coordinators: allUsers.filter((row) => row[4] === 'coordinator').length,
      studentHeads: allUsers.filter((row) => row[4] === 'student_head').length,
      teamMembers: allUsers.filter((row) => row[4] === 'team_member').length,
      requestors: allUsers.filter((row) => row[4] === 'requestor').length,
    };

    return NextResponse.json({
      success: true,
      taskStats,
      requestStats,
      userStats,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
