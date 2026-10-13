import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, updateUserRevokingSessions } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { authenticate, fail } from '@/lib/api';
import { generateTemporaryPassword } from '@/lib/password';
import { sendAccountReactivatedEmail } from '@/lib/email';

// Coordinator brings a deactivated person back: a fresh temporary password is
// emailed and they must choose their own on first sign-in.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { response } = await authenticate(['coordinator']);
    if (response) return response;

    const target = await getUserById(id);
    if (!target) return fail('User not found', 404);
    if (target.is_active) return fail('This user is already active', 400);

    const password = generateTemporaryPassword();
    const version = await updateUserRevokingSessions(id, {
      is_active: true,
      is_approved: true,
      must_change_password: true,
      password_hash: await hashPassword(password),
    });
    if (version === null) return fail('Failed to reactivate user', 500);

    const sent = await sendAccountReactivatedEmail(target.email, target.name, password);
    if (!sent) {
      // Nobody knows the new password, so put the account back as it was.
      await updateUser(id, {
        is_active: false,
        must_change_password: target.must_change_password,
        password_hash: target.password_hash,
      });
      return fail('Could not send the email, so the user was not reactivated. Check the email settings and try again.', 502);
    }

    return NextResponse.json({ success: true, message: 'User reactivated and emailed a temporary password' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    return fail('Failed to reactivate user', 500);
  }
}
