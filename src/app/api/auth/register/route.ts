import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { getUserByEmail, createUser, getAllUsers } from '@/lib/db';
import { sendRegistrationPendingEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await createUser({
      email,
      password_hash: passwordHash,
      name,
      role,
      skills: '',
      is_active: true,
      is_approved: false,
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
    }

    // Notify coordinators in background
    getAllUsers().then(users => {
      const coordinators = users.filter(
        u => (u.role === 'coordinator' || u.role === 'student_head') && u.is_active
      );
      for (const coordinator of coordinators) {
        sendRegistrationPendingEmail(coordinator.email, name, email, role).catch(console.error);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Pending admin approval.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
