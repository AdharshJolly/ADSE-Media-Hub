import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

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
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  return response.data.values || [];
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
