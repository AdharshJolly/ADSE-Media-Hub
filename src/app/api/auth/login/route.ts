import { NextRequest, NextResponse } from 'next/server';
import { findRowByColumn } from '@/lib/google-sheets';
import { verifyPassword, generateToken, setSession } from '@/lib/auth';
import { SHEETS } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    // Find user by email
    const userData = await findRowByColumn(SHEETS.USERS, 1, email);
    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = {
      user_id: userData.row[0],
      email: userData.row[1],
      name: userData.row[3],
      role: userData.row[4],
      skills: userData.row[5],
      is_active: userData.row[6] === 'TRUE' || userData.row[6] === 'true',
      is_approved: userData.row[7] === 'TRUE' || userData.row[7] === 'true',
    };

    // Check if user is approved
    if (!user.is_approved) {
      return NextResponse.json({ success: false, error: 'Account pending approval' }, { status: 403 });
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json({ success: false, error: 'Account is deactivated' }, { status: 403 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userData.row[2]);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    // Generate token
    const token = generateToken(user.user_id);

    // Set session cookie
    await setSession(token);

    return NextResponse.json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
