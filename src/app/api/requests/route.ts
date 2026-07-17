import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, appendRow, generateId } from '@/lib/google-sheets';
import { SHEETS } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const users = await getSheetData(SHEETS.USERS);
    const currentUser = users.find((row, index) => index > 0 && row[0] === session.userId);
    const userRole = currentUser?.[4];

    let requests = await getSheetData(SHEETS.REQUESTS);
    
    // Skip header row
    requests = requests.slice(1);

    // Filter based on role
    if (userRole === 'requestor') {
      requests = requests.filter((row) => row[1] === session.userId);
    }

    // Apply status filter
    if (status) {
      requests = requests.filter((row) => row[10] === status);
    }

    // Map to objects
    const requestsData = requests.map((row) => ({
      request_id: row[0],
      requestor_id: row[1],
      title: row[2],
      description: row[3],
      media_type: row[4],
      event_name: row[5],
      target_platform: row[6],
      style_reference: row[7],
      deadline: row[8],
      priority: row[9],
      status: row[10],
      coordinator_notes: row[11],
      created_at: row[12],
      updated_at: row[13],
    }));

    return NextResponse.json({ success: true, requests: requestsData });
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

    // Generate request ID
    const requestId = generateId('REQ');
    const now = new Date().toISOString();

    // Add request to sheet
    await appendRow(SHEETS.REQUESTS, [
      requestId,
      session.userId,
      title,
      description,
      mediaType,
      eventName || '',
      targetPlatform || '',
      styleReference || '',
      deadline,
      priority || 'medium',
      'pending',
      '', // coordinator_notes
      now,
      now,
    ]);

    return NextResponse.json({ success: true, requestId, message: 'Request created successfully' });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 });
  }
}
