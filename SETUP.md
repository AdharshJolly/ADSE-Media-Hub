# Quick Setup Guide

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com).
2. Create a spreadsheet for the portal database.
3. Add these sheets: Users, Requests, Tasks, Notifications, Sessions.
4. Copy the Spreadsheet ID from the URL.

## 2. Configure Google Apps Script

1. Go to [script.google.com](https://script.google.com).
2. Create a new project.
3. Add only these files from `legacy/backend/`:
   - Code.gs
   - EmailService.gs
4. Update `CONFIG.SPREADSHEET_ID` in Code.gs.
5. Set the Script Property `EMAIL_API_KEY` to a shared secret.
6. Deploy as a Web app with access set to Anyone.
7. Copy the Web app URL.

## 3. Set Up the Next.js App

1. Open the repository root.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create or update `.env` with:
   ```bash
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   JWT_SECRET=your_jwt_secret
   GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL=your_google_apps_script_email_web_app_url
   GOOGLE_APPS_SCRIPT_EMAIL_API_KEY=shared_secret_for_email_endpoint
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## 4. Verify the Workflow

1. Register a user.
2. Approve the account in Google Sheets or your admin flow.
3. Create a task and confirm email delivery through Apps Script.

## Notes

1. The legacy frontend/backend folders are no longer part of the active setup.
2. Email now goes through Google Apps Script MailApp instead of Resend.
