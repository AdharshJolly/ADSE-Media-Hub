import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, setSession } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';
import { fail, parseBody } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { getSettings } from '@/lib/settings';

// Constant-ish work for unknown emails so response time doesn't reveal which emails exist.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.9n9yXr7e3zq0Yk3rQYv8QeZ1u8Oa';

export async function POST(request: NextRequest) {
  try {
    const { data, response } = await parseBody(request, loginSchema);
    if (response) return response;

    const user = await getUserByEmail(data.email);
    const valid = await verifyPassword(data.password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !valid) {
      return fail('Invalid email or password', 401);
    }

    if (!user.is_active || !user.is_approved) {
      return fail('Account is not active. Contact your coordinator.', 403);
    }

    await setSession(generateToken(user.id));

    return NextResponse.json({
      success: true,
      maintenance: user.role !== 'coordinator' && (await getSettings()).maintenanceMode,
      mustChangePassword: user.must_change_password,
      user: {
        user_id: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        skills: user.skills,
        is_active: user.is_active,
        is_approved: user.is_approved,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return fail('Login failed', 500);
  }
}
