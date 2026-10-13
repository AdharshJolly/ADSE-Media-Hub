import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { env } from './env';
import { getSessionUser } from './db';
import type { UserRole } from '@/types/database';

const JWT_SECRET = env.JWT_SECRET;
// Default sign-in lasts a day. "Keep me signed in" lasts as long as browsers allow
// (cookies are capped at about 400 days); it still ends on password change/reset,
// deactivation or a coordinator removing the account.
const DAY = 24 * 60 * 60;
const SHORT_SESSION = DAY;
const LONG_SESSION = 365 * DAY;

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

// tv = the user's token_version at sign-in. Bumping it in the database signs out every session.
export function generateToken(userId: string, tokenVersion = 0, remember = false): string {
  return jwt.sign({ userId, tv: tokenVersion, rm: remember }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: remember ? LONG_SESSION : SHORT_SESSION,
  });
}

export function verifyToken(token: string): { userId: string; tv: number; rm: boolean } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; tv?: number; rm?: boolean };
    return { userId: payload.userId, tv: payload.tv ?? 0, rm: payload.rm === true };
  } catch {
    return null;
  }
}

export interface Session {
  userId: string;
  role: UserRole;
  mustChangePassword: boolean;
  remember: boolean;
}

// Verifies the JWT and re-checks the user against the database, so
// deactivated or removed users lose access immediately.
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await getSessionUser(payload.userId, payload.tv);
  if (!user || !user.is_active || !user.is_approved) return null;
  if ((user.token_version ?? 0) !== payload.tv) return null;

  return {
    userId: user.id,
    role: user.role,
    mustChangePassword: user.must_change_password,
    remember: payload.rm,
  };
}

export async function setSession(token: string, remember = false): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: remember ? LONG_SESSION : SHORT_SESSION,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}
