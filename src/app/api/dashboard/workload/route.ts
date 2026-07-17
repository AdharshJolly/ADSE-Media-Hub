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

    const [tasks, users] = await Promise.all([
      getSheetData(SHEETS.TASKS),
      getSheetData(SHEETS.USERS),
    ]);

    // Skip header rows
    const allTasks = tasks.slice(1);

    // Get all active team members
    const teamMembers = users
      .slice(1)
      .filter(
        (row) =>
          row[4] === 'team_member' &&
          (row[6] === 'TRUE' || row[6] === 'true') &&
          (row[7] === 'TRUE' || row[7] === 'true')
      );

    // Calculate workload for each team member
    const workload = teamMembers.map((member) => {
      const memberTasks = allTasks.filter((row) => row[3] === member[0]);

      return {
        user_id: member[0],
        name: member[3],
        email: member[1],
        skills: member[5],
        total_tasks: memberTasks.length,
        pending: memberTasks.filter((row) => row[9] === 'pending').length,
        in_progress: memberTasks.filter((row) => row[9] === 'in_progress').length,
        completed: memberTasks.filter((row) => row[9] === 'completed').length,
        overdue: memberTasks.filter((row) => row[9] === 'overdue').length,
      };
    });

    // Sort by total tasks descending
    workload.sort((a, b) => b.total_tasks - a.total_tasks);

    return NextResponse.json({ success: true, workload });
  } catch (error) {
    console.error('Get team workload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch workload' }, { status: 500 });
  }
}
