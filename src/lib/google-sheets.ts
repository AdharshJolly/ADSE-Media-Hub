import { google } from 'googleapis';
import { env } from './env';
import { getAllUsers, getTasks, getRequests } from './db';
import { supabase } from './supabase';

// One-way mirror: Supabase is the source of truth, each tab is fully rewritten on every sync.
// Password hashes and other secrets are never exported.

type Cell = string | number | boolean;

function getSheets() {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key || !env.GOOGLE_SPREADSHEET_ID) {
    throw new Error('Google Sheets is not configured');
  }
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export function getSpreadsheetUrl(): string | null {
  return env.GOOGLE_SPREADSHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SPREADSHEET_ID}`
    : null;
}

async function writeTab(
  sheets: ReturnType<typeof getSheets>,
  existing: Set<string>,
  tab: string,
  header: string[],
  rows: Cell[][],
): Promise<void> {
  const spreadsheetId = env.GOOGLE_SPREADSHEET_ID!;

  if (!existing.has(tab)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] },
    });
    existing.add(tab);
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${tab}'` });
  // RAW keeps every value as literal text, so user input like "=HYPERLINK(...)" cannot run as a formula.
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tab}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header, ...rows] },
  });
}

export interface SyncResult {
  users: number;
  requests: number;
  tasks: number;
  syncedAt: string;
}

export async function syncToSheets(): Promise<SyncResult> {
  const sheets = getSheets();

  const [users, requests, tasks, meta] = await Promise.all([
    getAllUsers(),
    getRequests(),
    getTasks(),
    sheets.spreadsheets.get({ spreadsheetId: env.GOOGLE_SPREADSHEET_ID!, fields: 'sheets.properties.title' }),
  ]);

  const existing = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title ?? ''));
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const who = (id: string | null | undefined) => (id ? nameOf.get(id) ?? id : '');

  const { data: links } = await supabase.from('task_assignees').select('task_id, user_id');
  const assigneeIds = new Map<string, string[]>();
  for (const l of links ?? []) assigneeIds.set(l.task_id, [...(assigneeIds.get(l.task_id) ?? []), l.user_id]);

  // Sequential: concurrent writes to one spreadsheet can hit Google's per-document write limits.
  await writeTab(sheets, existing, 'Users',
    ['ID', 'Name', 'Email', 'Role', 'Skills', 'Active', 'Created'],
    users.map((u) => [u.id, u.name, u.email, u.role, u.skills ?? '', u.is_active, u.created_at]),
  );

  await writeTab(sheets, existing, 'Requests',
    ['ID', 'Title', 'Requestor', 'Media type', 'Event', 'Platform', 'Priority', 'Status', 'Deadline', 'Coordinator notes', 'Created', 'Updated'],
    requests.map((r) => [
      r.id, r.title, who(r.requestor_id), r.media_type, r.event_name ?? '', r.target_platform ?? '',
      r.priority, r.status, r.deadline, r.coordinator_notes ?? '', r.created_at, r.updated_at,
    ]),
  );

  await writeTab(sheets, existing, 'Tasks',
    ['ID', 'Request ID', 'Title', 'Description', 'Media type', 'Assigned to (lead)', 'All assignees', 'Created by', 'Priority', 'Status', 'Deadline', 'Completed', 'Notes', 'Created', 'Updated'],
    tasks.map((t) => [
      t.id, t.request_id ?? '', t.title, t.description ?? '', t.media_type ?? '', who(t.assigned_to), (assigneeIds.get(t.id) ?? []).map(who).join(', '), who(t.created_by),
      t.priority, t.status, t.deadline, t.completion_date ?? '', t.notes ?? '', t.created_at, t.updated_at,
    ]),
  );

  return {
    users: users.length,
    requests: requests.length,
    tasks: tasks.length,
    syncedAt: new Date().toISOString(),
  };
}
