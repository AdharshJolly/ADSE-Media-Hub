import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRequestsPaginated, createRequest, getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'completed' | null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const currentUser = await getUserById(session.userId);

    // Requestors can only see their own requests
    const filters = {
      status: status || undefined,
      requestor_id: currentUser?.role === 'requestor' ? session.userId : undefined,
    };

    const result = await getRequestsPaginated(page, pageSize, filters);

    return NextResponse.json({ success: true, ...result }, {
      headers: {
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, mediaType, eventName, targetPlatform, styleReference, deadline, priority } = body;

    if (!title || !description || !mediaType || !deadline) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const newRequest = await createRequest({
      requestor_id: session.userId,
      title,
      description,
      media_type: mediaType,
      event_name: eventName || '',
      target_platform: targetPlatform || '',
      style_reference: styleReference || '',
      deadline,
      priority: priority || 'medium',
      status: 'pending',
      coordinator_notes: '',
    });

    if (!newRequest) {
      return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, requestId: newRequest.id, message: 'Request created successfully' });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 });
  }
}
