# Setup Guide

About 30 minutes end to end. You need accounts for Supabase, Vercel and Google.

## 1. Supabase (database)

1. Create a project at [supabase.com](https://supabase.com). Pick the region closest to your users (the project uses `ap-south-1`).
2. Open **SQL Editor**, paste `supabase/schema.sql` and run it.
3. From **Project Settings > API**, copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY` (server-only, never commit or expose it)

## 2. Email (Google Apps Script)

1. Go to [script.google.com](https://script.google.com) and create a project.
2. Add `backend/EmailService.gs` from this repo.
3. In **Project Settings > Script Properties** add `EMAIL_API_KEY` with a long random value.
4. **Deploy > New deployment > Web app**. Execute as: Me. Access: Anyone.
5. Copy the Web app URL -> `GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL`, and the same key -> `GOOGLE_APPS_SCRIPT_EMAIL_API_KEY`.

## 3. Google Sheets sync (optional)

1. In Google Cloud, create a service account and enable the Google Sheets API.
2. Create a JSON key. Copy `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` -> `GOOGLE_PRIVATE_KEY` (keep the `\n` escapes, wrap in quotes).
3. Create a spreadsheet, share it with the service account email as Editor, and copy the ID from its URL -> `GOOGLE_SPREADSHEET_ID`.

The sync is one-way (app to Sheets). Tabs are created and rewritten on every sync from **Admin > Sync now**.

## 4. Environment variables

```bash
cp .env.example .env
```

Fill in every value. Generators:

```bash
# JWT_SECRET (min 32 chars)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# CRON_SECRET (min 16 chars): any random string
# VAPID keys for browser push
npx web-push generate-vapid-keys
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database |
| `JWT_SECRET` | Signs session cookies |
| `CRON_SECRET` | Shared secret for scheduled jobs |
| `GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL`, `GOOGLE_APPS_SCRIPT_EMAIL_API_KEY` | Email delivery |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Browser push |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID` | Sheets sync (optional) |
| `NEXT_PUBLIC_APP_URL` | Public URL, used in emails |

## 5. Run locally

```bash
npm install
npm run seed:admin -- you@example.com "Your Name"   # prints a one-time password
npm run dev
```

Open http://localhost:3000 and sign in as the coordinator. You will be asked to change the password.

> On Windows behind a TLS-intercepting proxy, scripts need `node --use-system-ca` (the `seed:admin` script already does this).

## 6. Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add every variable from step 4 under **Settings > Environment Variables**, with `NEXT_PUBLIC_APP_URL` set to the production domain.
3. Under **Settings > Functions**, set the region to `bom1` (Mumbai) to sit next to Supabase `ap-south-1`.
4. Deploy.

## 7. Scheduled jobs (after the first deploy)

1. Open `supabase/cron.sql` and replace `YOUR-APP.vercel.app` and `YOUR_CRON_SECRET` (must equal `CRON_SECRET` in Vercel).
2. Run it in the Supabase SQL editor.

This marks late tasks overdue every 15 minutes and sends deadline reminders daily at 09:00 IST.

## 8. Verify

1. Sign in as the coordinator, open **Users > Add user**, and create a requestor (they are emailed a temporary password).
2. As the requestor, submit a request.
3. As the coordinator, approve it, assign the task, and confirm the notification arrives.
4. **Admin > Sync now** to confirm the Sheet fills (if configured).

## Maintenance

- Reset all data (test data only): run `supabase/reset.sql`, then `supabase/schema.sql`, then `npm run seed:admin`.
- Admin page has an email toggle and a maintenance-mode switch for non-coordinators.
