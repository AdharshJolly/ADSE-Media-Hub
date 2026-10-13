import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db';
import { clientIp, fail, parseBody } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';
import { consumeResetToken, isRateLimited } from '@/lib/password';

// Completes the emailed-link reset. Does not sign anyone in: the user logs in with the
// new password, and every existing session is revoked by the token_version bump.
export async function POST(request: NextRequest) {
  try {
    const { data, response } = await parseBody(request, resetPasswordSchema);
    if (response) return response;

    if (await isRateLimited(`reset-submit:ip:${clientIp(request)}`, 10, 15)) {
      return fail('Too many attempts. Try again later.', 429);
    }

    const userId = await consumeResetToken(data.token);
    const user = userId ? await getUserById(userId) : null;
    if (!user || !user.is_active || !user.is_approved) {
      return fail('This reset link is invalid or has expired. Request a new one.', 400);
    }

    const ok = await updateUser(user.id, {
      password_hash: await hashPassword(data.newPassword),
      must_change_password: false,
      token_version: (user.token_version ?? 0) + 1,
    });
    if (!ok) return fail('Failed to reset password', 500);

    return NextResponse.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return fail('Failed to reset password', 500);
  }
}
