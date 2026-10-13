import { NextRequest, NextResponse } from 'next/server';
import { createRequest } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { authenticate, fail, parseBody, parsePagination } from '@/lib/api';
import { createRequestSchema } from '@/lib/validation';
import { requestSearchFilter } from '@/lib/search';

const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'completed'];

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status = statusParam && REQUEST_STATUSES.includes(statusParam) ? statusParam : null;
    const { page, pageSize } = parsePagination(searchParams);
    // Strip characters that have meaning in PostgREST filter syntax
    const search = (searchParams.get('search') || '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 100);

    let query = supabase
      .from('requests')
      .select('*, tasks!tasks_request_id_fkey(id, status, assigned_to, title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Requestors can only see their own requests
    if (session.role === 'requestor') {
      query = query.eq('requestor_id', session.userId);
    } else if (session.role === 'team_member') {
      return fail('Permission denied', 403);
    }

    if (status) query = query.eq('status', status);

    if (search) {
      query = query.or(await requestSearchFilter(search));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get requests error:', error);
      return fail('Failed to fetch requests', 500);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=15' },
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return fail('Failed to fetch requests', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, createRequestSchema);
    if (bad) return bad;

    const newRequest = await createRequest({
      requestor_id: session.userId,
      title: data.title,
      description: data.description,
      media_type: data.mediaType,
      event_name: data.eventName,
      target_platform: data.targetPlatform,
      style_reference: data.styleReference,
      deadline: data.deadline,
      priority: data.priority,
      status: 'pending',
      coordinator_notes: '',
    });

    if (!newRequest) return fail('Failed to create request', 500);

    return NextResponse.json({ success: true, requestId: newRequest.id, message: 'Request created successfully' });
  } catch (error) {
    console.error('Create request error:', error);
    return fail('Failed to create request', 500);
  }
}
