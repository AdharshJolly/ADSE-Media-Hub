import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 30_000; // 30 seconds - good balance for Sheets API

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

const getAuth = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const getSheets = () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
};

export const SHEETS = {
  USERS: 'Users',
  REQUESTS: 'Requests',
  TASKS: 'Tasks',
  NOTIFICATIONS: 'Notifications',
} as const;

export async function getSheetData(sheetName: string): Promise<string[][]> {
  const cacheKey = `sheet:${sheetName}`;
  const cached = getCached<string[][]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  const data = response.data.values || [];
  setCache(cacheKey, data);
  return data;
}

export function invalidateCache(sheetName?: string): void {
  if (sheetName) {
    cache.delete(`sheet:${sheetName}`);
  } else {
    cache.clear();
  }
}

export async function appendRow(sheetName: string, row: (string | number | boolean | Date)[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
  invalidateCache(sheetName);
}

export async function updateRow(
  sheetName: string,
  rowIndex: number,
  row: (string | number | boolean | Date)[]
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
  invalidateCache(sheetName);
}

export async function findRowByColumn(
  sheetName: string,
  columnIndex: number,
  value: string
): Promise<{ row: string[]; index: number } | null> {
  const data = await getSheetData(sheetName);
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex] === value) {
      return { row: data[i], index: i };
    }
  }
  return null;
}

export async function findAllRowsByColumn(
  sheetName: string,
  columnIndex: number,
  value: string
): Promise<{ row: string[]; index: number }[]> {
  const data = await getSheetData(sheetName);
  const results: { row: string[]; index: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex] === value) {
      results.push({ row: data[i], index: i });
    }
  }
  return results;
}

export function generateId(prefix: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${dateStr}-${random}`;
}

// Helper: find current user from cached users sheet
export async function getCurrentUser(userId: string): Promise<string[] | null> {
  const users = await getSheetData(SHEETS.USERS);
  const user = users.find((row, index) => index > 0 && row[0] === userId);
  return user || null;
}

// Helper: check if user has role
export async function userHasRole(userId: string, roles: string[]): Promise<boolean> {
  const user = await getCurrentUser(userId);
  return user ? roles.includes(user[4]) : false;
}
