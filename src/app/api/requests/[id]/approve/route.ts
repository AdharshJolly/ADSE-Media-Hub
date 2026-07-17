import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSheetData, updateRow } from '@/lib/google-sheets';
import { SHEETS } from '@/lib/google-sheets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is coordinator or student head
    const users = await getSheetData(SHEETS.USERS);
    const currentUser = users.find((row, index) => index > 0 && row[0] === session.userId);
    
    if (!currentUser || (currentUser[4] !== 'coordinator' && currentUser[4] !== 'student_head')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    // Find request
    const requests = await getSheetData(SHEETS.REQUESTS);
    const requestIndex = requests.findIndex((row, index) => index > 0 && row[0] === requestId);
    
    if (requestIndex === -1) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notes } = body;

    // Update status (column 10 = status, column 11 = coordinator_notes)
    const requestRow = requests[requestIndex];
    requestRow[10] = 'approved';
    requestRow[11] = notes || '';
    requestRow[13] = new Date().toISOString(); // updated_at

    await updateRow(SHEETS.REQUESTS, requestIndex, requestRow);

    return NextResponse.json({ success: true, message: 'Request approved successfully' });
  } catch (error) {
    console.error('Approve request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve request' }, { status: 500 });
  }
}
