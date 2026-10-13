import { NextRequest, NextResponse } from 'next/server';
import { createUser, getAllUsers, getUserByEmail, bustStats } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { authenticate, fail, parseBody, STAFF_ROLES } from '@/lib/api';
import { createUserSchema } from '@/lib/validation';
import { generateTemporaryPassword } from '@/lib/password';
import { sendWelcomeCredentialsEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';

// Coordinator adds a person: the server picks a random password and emails it.
export async function POST(request: NextRequest) {
  try {
    const { response } = await authenticate(['coordinator']);
    if (response) return response;

    const { data, response: bad } = await parseBody(request, createUserSchema);
    if (bad) return bad;

    if (await getUserByEmail(data.email)) {
      return fail('A user with this email already exists', 409);
    }

    const password = generateTemporaryPassword();
    const user = await createUser({
      email: data.email,
      name: data.name,
      role: data.role,
      skills: '',
      password_hash: await hashPassword(password),
      is_active: true,
      is_approved: true,
      must_change_password: true,
    });
    if (!user) return fail('Failed to create user', 500);

    const sent = await sendWelcomeCredentialsEmail(user.email, user.name, password);
    if (!sent) {
      // Nobody knows the password, so don't leave an unusable account behind.
      await supabase.from('users').delete().eq('id', user.id);
      bustStats();
      return fail('Could not send the welcome email, so the user was not created. Check the email settings and try again.', 502);
    }

    return NextResponse.json(
      { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create user error:', error);
    return fail('Failed to create user', 500);
  }
}

export async function GET() {
  try {
    const { response } = await authenticate(STAFF_ROLES);
    if (response) return response;

    const users = await getAllUsers();
    
    // Map to include both id and user_id for backward compatibility
    const mappedUsers = users.map(u => ({
      user_id: u.id,
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      skills: u.skills,
      is_active: u.is_active,
      is_approved: u.is_approved,
      must_change_password: u.must_change_password,
      created_at: u.created_at,
    }));

    return NextResponse.json({ success: true, users: mappedUsers }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return fail('Failed to fetch users', 500);
  }
}
