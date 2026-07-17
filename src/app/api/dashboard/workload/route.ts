import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, SHEETS } from '@/lib/google-sheets';

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

    const allTasks = tasks.slice(1);

    const teamMembers = users
      .slice(1)
      .filter(
        (row) =>
          row[4] === 'team_member' &&
          (row[6] === 'TRUE' || row[6] === 'true') &&
          (row[7] === 'TRUE' || row[7] === 'true')
      );

    // Single pass workload calculation
    const workloadMap = new Map<string, {
      user_id: string;
      name: string;
      email: string;
      skills: string;
      total_tasks: number;
      pending: number;
      in_progress: number;
      completed: number;
      overdue: number;
    }>();

    for (const member of teamMembers) {
      workloadMap.set(member[0], {
        user_id: member[0],
        name: member[3],
        email: member[1],
        skills: member[5],
        total_tasks: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
      });
    }

    for (const task of allTasks) {
      const member = workloadMap.get(task[3]);
      if (member) {
        member.total_tasks++;
        const status = task[9];
        if (status === 'pending') member.pending++;
        else if (status === 'in_progress') member.in_progress++;
        else if (status === 'completed') member.completed++;
        else if (status === 'overdue') member.overdue++;
      }
    }

    const workload = Array.from(workloadMap.values())
      .sort((a, b) => b.total_tasks - a.total_tasks);

    return NextResponse.json({ success: true, workload }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Get team workload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch workload' }, { status: 500 });
  }
}
