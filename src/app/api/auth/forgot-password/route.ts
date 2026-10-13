import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { clientIp, fail, parseBody } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { isRateLimited, pruneRateLimits, createResetToken, deleteResetToken, RESET_TOKEN_MINUTES } from '@/lib/password';
import { sendPasswordResetLinkEmail } from '@/lib/email';

const GENERIC = {
  success: true,
  message: 'If that email belongs to an account, a reset link has been sent.',
};

// Always answers the same way, whether or not the email exists, and does the
// lookup/email work after the response so timing doesn't leak it either.
// Nothing about the account changes until the owner opens the emailed link.
export async function POST(request: NextRequest) {
  try {
    const { data, response } = await parseBody(request, forgotPasswordSchema);
    if (response) return response;

    const ip = clientIp(request);
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

        const token = await createResetToken(user.id);
        if (!token) return;

        const sent = await sendPasswordResetLinkEmail(user.email, user.name, token, RESET_TOKEN_MINUTES);
        if (!sent) await deleteResetToken(token);
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
