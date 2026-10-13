import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { getSession, type Session } from './auth';
import { getTaskById, getRequestById, getAssignedTaskIds } from './db';
import { getSettings } from './settings';
import type { Task, UserRole } from '@/types/database';

export const STAFF_ROLES: UserRole[] = ['coordinator', 'student_head'];

// Vercel sets x-vercel-forwarded-for itself, so a client cannot spoof it.
export function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

type AuthResult =
  | { session: Session; response?: undefined }
  | { session?: undefined; response: NextResponse };

// Resolves the current session, optionally restricted to certain roles.
// Blocks every route (except those calling getSession directly) while the
// user still has to change their temporary password.
export async function authenticate(roles?: UserRole[]): Promise<AuthResult> {
  const session = await getSession();
  if (!session) return { response: fail('Not authenticated', 401) };
  if (session.mustChangePassword) {
    return { response: fail('Password change required', 403, { code: 'PASSWORD_CHANGE_REQUIRED' }) };
  }
  if (session.role !== 'coordinator' && (await getSettings()).maintenanceMode) {
    return { response: fail('The system is under maintenance. Please try again later.', 503, { code: 'MAINTENANCE' }) };
  }
  if (roles && !roles.includes(session.role)) {
    return { response: fail('Permission denied', 403) };
  }
  return { session };
}

type BodyResult<T> = { data: T; response?: undefined } | { data?: undefined; response: NextResponse };

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<BodyResult<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { response: fail('Invalid JSON body', 400) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.');
    return { response: fail(field ? `${field}: ${issue.message}` : issue.message, 400) };
  }
  return { data: parsed.data };
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20));
  return { page, pageSize };
}

// Returns the task if the session may see it, otherwise null.
// Staff: all tasks. Team members: assigned tasks. Requestors: tasks from their requests.
export async function getAccessibleTask(taskId: string, session: Session): Promise<Task | null> {
  const task = await getTaskById(taskId);
  if (!task) return null;
  if (STAFF_ROLES.includes(session.role)) return task;
  if (session.role === 'team_member') return (await getAssignedTaskIds(session.userId)).includes(taskId) ? task : null;
  if (task.request_id) {
    const req = await getRequestById(task.request_id);
    if (req?.requestor_id === session.userId) return task;
  }
  return null;
}
