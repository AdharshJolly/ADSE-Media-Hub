import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, findRowByColumn, generateId } from '@/lib/google-sheets';
import { hashPassword } from '@/lib/auth';
import { sendRegistrationPendingEmail } from '@/lib/email';
import { SHEETS } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await findRowByColumn(SHEETS.USERS, 1, email);
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate user ID
    const userId = generateId('USR');

    // Add user to sheet
    await appendRow(SHEETS.USERS, [
      userId,
      email,
      passwordHash,
      name,
      role,
      '', // skills
      true, // is_active
      false, // is_approved (pending approval)
      new Date().toISOString(),
    ]);

    // Notify coordinators
    const users = await getSheetData(SHEETS.USERS);
    const coordinators = users.filter(
      (row, index) => index > 0 && (row[4] === 'coordinator' || row[4] === 'student_head') && row[6] === 'TRUE'
    );

    for (const coordinator of coordinators) {
      await sendRegistrationPendingEmail(coordinator[1], name, email, role);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Pending admin approval.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
