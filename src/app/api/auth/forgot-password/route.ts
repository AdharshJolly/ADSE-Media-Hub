import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { getUserByEmail, updateUser } from '@/lib/db';
import { fail, parseBody } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { generateTemporaryPassword, isRateLimited, pruneRateLimits } from '@/lib/password';
import { sendPasswordResetEmail } from '@/lib/email';

const GENERIC = {
  success: true,
  message: 'If that email belongs to an account, a new temporary password has been sent.',
};

// Always answers the same way, whether or not the email exists, and does the
// lookup/email work after the response so timing doesn't leak it either.
export async function POST(request: NextRequest) {
  try {
    const { data, response } = await parseBody(request, forgotPasswordSchema);
    if (response) return response;

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const [emailLimited, ipLimited] = await Promise.all([
      isRateLimited(`reset:email:${data.email}`, 3, 60),
      isRateLimited(`reset:ip:${ip}`, 10, 60),
    ]);
    if (emailLimited || ipLimited) {
      return fail('Too many requests. Try again later.', 429);
    }

    after(async () => {
      try {
        await pruneRateLimits();
        const user = await getUserByEmail(data.email);
        if (!user || !user.is_active || !user.is_approved) return;

        const password = generateTemporaryPassword();
        const previousHash = user.password_hash!;
        const ok = await updateUser(user.id, {
          password_hash: await hashPassword(password),
          must_change_password: true,
        });
        if (!ok) return;

        const sent = await sendPasswordResetEmail(user.email, user.name, password);
        if (!sent) {
          // Don't leave the account on a password nobody received.
          await updateUser(user.id, {
            password_hash: previousHash,
            must_change_password: user.must_change_password,
          });
        }
      } catch (error) {
        console.error('Forgot password background error:', error);
      }
    });

    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error('Forgot password error:', error);
    return fail('Request failed', 500);
  }
}
