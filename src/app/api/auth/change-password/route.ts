import { NextRequest, NextResponse } from 'next/server';
import { generateToken, getSession, hashPassword, setSession, verifyPassword } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db';
import { fail, parseBody } from '@/lib/api';
import { changePasswordSchema } from '@/lib/validation';
import { isRateLimited } from '@/lib/password';

// Uses getSession (not authenticate) on purpose: this is the one route a user
// with must_change_password may call.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return fail('Not authenticated', 401);

    // Stops a stolen session from guessing the current password.
    if (await isRateLimited(`chpw:user:${session.userId}`, 5, 15)) {
      return fail('Too many attempts. Try again in a few minutes.', 429);
    }

    const { data, response } = await parseBody(request, changePasswordSchema);
    if (response) return response;

    const user = await getUserById(session.userId);
    if (!user?.password_hash) return fail('User not found', 404);

    if (!(await verifyPassword(data.currentPassword, user.password_hash))) {
      return fail('Current password is incorrect', 400);
    }

    // Bumping token_version signs out every other session; this browser gets a fresh cookie.
    const tokenVersion = (user.token_version ?? 0) + 1;
    const ok = await updateUser(user.id, {
      password_hash: await hashPassword(data.newPassword),
      must_change_password: false,
      token_version: tokenVersion,
    });
    if (!ok) return fail('Failed to update password', 500);

    await setSession(generateToken(user.id, tokenVersion, session.remember), session.remember);

    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    return fail('Failed to update password', 500);
  }
}
