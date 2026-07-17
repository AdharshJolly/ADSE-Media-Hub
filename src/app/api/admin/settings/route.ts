import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, supabase } from '@/lib/db';

// In a real app, these would be stored in a database
// For now, we'll use a simple in-memory store
const settingsStore: Record<string, boolean> = {
  maintenanceMode: false,
  allowRegistration: true,
  emailNotifications: true,
  taskAutoAssign: false,
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ success: true, settings: settingsStore });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await getUserById(session.userId);
    if (!currentUser || currentUser.role !== 'coordinator') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    
    // Update settings
    Object.keys(body).forEach(key => {
      if (key in settingsStore) {
        settingsStore[key] = body[key];
      }
    });

    return NextResponse.json({ success: true, settings: settingsStore });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
