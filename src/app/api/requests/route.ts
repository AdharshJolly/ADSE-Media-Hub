import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createRequest, getUserById } from '@/lib/db';
import { supabase } from '@/lib/supabase';

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
    const search = searchParams.get('search') || '';

    const currentUser = await getUserById(session.userId);

    // Build query
    let query = supabase
      .from('requests')
      .select('*, tasks!tasks_request_id_fkey(id, status, assigned_to, title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Requestors can only see their own requests
    if (currentUser?.role === 'requestor') {
      query = query.eq('requestor_id', session.userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,event_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get requests error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }, {
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
