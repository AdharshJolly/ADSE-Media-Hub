import { NextResponse } from 'next/server';
import { generateToken, getSession, setSession } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db';
import { fail } from '@/lib/api';

// Signs out every other device: bumps token_version, then re-issues this browser's cookie.
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return fail('Not authenticated', 401);

    const user = await getUserById(session.userId);
    if (!user) return fail('User not found', 404);

    const tokenVersion = (user.token_version ?? 0) + 1;
    if (!(await updateUser(user.id, { token_version: tokenVersion }))) return fail('Failed to sign out other devices', 500);

    await setSession(generateToken(user.id, tokenVersion, session.remember), session.remember);
    return NextResponse.json({ success: true, message: 'Signed out of all other devices' });
  } catch (error) {
    console.error('Logout others error:', error);
    return fail('Failed to sign out other devices', 500);
  }
}
