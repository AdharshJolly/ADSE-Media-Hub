import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, setSession } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.is_approved) {
      return NextResponse.json({ success: false, error: 'Account pending approval' }, { status: 403 });
    }

    if (!user.is_active) {
      return NextResponse.json({ success: false, error: 'Account is deactivated' }, { status: 403 });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash!);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    const token = generateToken(user.id);
    await setSession(token);

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        skills: user.skills,
        is_active: user.is_active,
        is_approved: user.is_approved,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
