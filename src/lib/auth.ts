import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { env } from './env';
import { getSessionUser } from './db';
import type { UserRole } from '@/types/database';

const JWT_SECRET = env.JWT_SECRET;
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

// tv = the user's token_version at sign-in. Bumping it in the database signs out every session.
export function generateToken(userId: string, tokenVersion = 0): string {
  return jwt.sign({ userId, tv: tokenVersion }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
}

export function verifyToken(token: string): { userId: string; tv: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; tv?: number };
    return { userId: payload.userId, tv: payload.tv ?? 0 };
  } catch {
    return null;
  }
}

export interface Session {
  userId: string;
  role: UserRole;
  mustChangePassword: boolean;
}

// Verifies the JWT and re-checks the user against the database, so
// deactivated or removed users lose access immediately.
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await getSessionUser(payload.userId);
  if (!user || !user.is_active || !user.is_approved) return null;
  if ((user.token_version ?? 0) !== payload.tv) return null;

  return {
    userId: user.id,
    role: user.role,
    mustChangePassword: user.must_change_password,
  };
}

export async function setSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}
