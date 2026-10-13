import { NextResponse } from 'next/server';
import { generateToken, getSession, setSession } from '@/lib/auth';
import { updateUserRevokingSessions } from '@/lib/db';
import { fail } from '@/lib/api';

// Signs out every other device: bumps token_version, then re-issues this browser's cookie.
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return fail('Not authenticated', 401);

    const tokenVersion = await updateUserRevokingSessions(session.userId);
    if (tokenVersion === null) return fail('Failed to sign out other devices', 500);

    await setSession(generateToken(session.userId, tokenVersion, session.remember), session.remember);
    return NextResponse.json({ success: true, message: 'Signed out of all other devices' });
  } catch (error) {
    console.error('Logout others error:', error);
    return fail('Failed to sign out other devices', 500);
  }
}
