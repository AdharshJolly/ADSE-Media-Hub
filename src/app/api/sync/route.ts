import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getAllUsers, getTasks, getRequests, getNotifications } from '@/lib/db';

// Google Sheets sync endpoint
// This will sync data from Supabase to Google Sheets
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);
    if (!currentUser || currentUser.role !== 'coordinator') {
      return NextResponse.json({ success: false, error: 'Only coordinators can sync data' }, { status: 403 });
    }

    // Fetch all data from Supabase
    const [users, tasks, requests] = await Promise.all([
      getAllUsers(),
      getTasks(),
      getRequests(),
    ]);

    // Prepare data for Google Sheets format
    const syncData = {
      users: users.map(u => ({
        user_id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        skills: u.skills,
        is_active: u.is_active,
        is_approved: u.is_approved,
        created_at: u.created_at,
      })),
      tasks: tasks.map(t => ({
        task_id: t.id,
        request_id: t.request_id,
        created_by: t.created_by,
        assigned_to: t.assigned_to,
        title: t.title,
        description: t.description,
        media_type: t.media_type,
        priority: t.priority,
        deadline: t.deadline,
        status: t.status,
        completion_date: t.completion_date,
        notes: t.notes,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      requests: requests.map(r => ({
        request_id: r.id,
        requestor_id: r.requestor_id,
        title: r.title,
        description: r.description,
        media_type: r.media_type,
        event_name: r.event_name,
        target_platform: r.target_platform,
        style_reference: r.style_reference,
        deadline: r.deadline,
        priority: r.priority,
        status: r.status,
        coordinator_notes: r.coordinator_notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      syncedAt: new Date().toISOString(),
    };

    // TODO: Implement actual Google Sheets API call
    // For now, we'll return the data that would be synced
    console.log('Sync data prepared:', {
      users: syncData.users.length,
      tasks: syncData.tasks.length,
      requests: syncData.requests.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Data prepared for sync',
      data: syncData,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
