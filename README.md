# ADSE Media Hub

Task and request management for a college media team. Faculty and students submit media requests, heads approve them, and team members deliver the work, with deadlines, reminders, comments and a calendar along the way.

Version **0.1.0**

## Features

- **Roles**: Coordinator, Student Head, Team Member, Requestor, each with its own access.
- **Requests**: requestors submit work; coordinators/heads approve (a task is auto-created) or reject with a reason.
- **Tasks**: create, assign, track status; list, Kanban board and calendar (month, week, agenda) views.
- **Collaboration**: comments, resource links, per-task activity feed.
- **Notifications**: in-app, email and browser push. Deadline reminders at 7/3/1 days plus overdue alerts.
- **Admin**: user management (admin adds users, a random password is emailed), email toggle, maintenance mode, Google Sheets sync status.
- **Global search** across tasks and people.
- **Google Sheets mirror**: one-way sync, software to Sheets. The database is the source of truth.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React, Tailwind CSS |
| Database | Supabase (Postgres), accessed server-side with the service-role key |
| Auth | Own JWT cookie sessions, bcrypt password hashes |
| Email | Google Apps Script MailApp endpoint (`backend/EmailService.gs`) |
| Push | Web Push (VAPID) with a service worker |
| Jobs | Supabase `pg_cron` + `pg_net` calling `/api/cron/reminders` |
| Hosting | Vercel (function region `bom1`) with Supabase `ap-south-1` |

## Project structure

```
backend/EmailService.gs   Apps Script email endpoint (deploy separately)
public/                   Static assets, brand logos, service worker
scripts/seed-admin.mjs    Creates the first coordinator
src/app/                  Pages and API routes (App Router)
src/components/           UI components
src/lib/                  DB access, auth, email, push, Sheets sync, validation
supabase/schema.sql       Database schema
supabase/cron.sql         Scheduled jobs (run after first deploy)
supabase/reset.sql        DESTRUCTIVE: drops all app tables (test data only)
SETUP.md                  Step-by-step setup
```

## Quick start

Full instructions are in [SETUP.md](SETUP.md).

```bash
npm install
cp .env.example .env      # fill in values
# run supabase/schema.sql in the Supabase SQL editor
npm run seed:admin -- you@example.com "Your Name"
npm run dev
```

## User roles

| Role | Can do |
| --- | --- |
| **Coordinator** | Everything: manage users, admin settings, approve/reject requests, create/assign/delete tasks |
| **Student Head** | Approve/reject requests, create and assign tasks |
| **Team Member** | See assigned tasks, update their status, comment, add links |
| **Requestor** | Submit requests, see their own requests and notifications |

Pages are guarded client-side by role; every API route also checks the session and role server-side.

## API overview

All routes are under `/api` and need a session cookie unless noted.

| Area | Routes |
| --- | --- |
| Auth | `POST auth/login`, `POST auth/logout`, `GET auth/me`, `POST auth/change-password`, `POST auth/forgot-password` (public: login, forgot-password) |
| Users | `GET/POST users`, `POST users/:id/deactivate`, `GET users/team-members` |
| Requests | `GET/POST requests`, `POST requests/:id/approve`, `POST requests/:id/reject` |
| Tasks | `GET/POST tasks`, `GET/DELETE tasks/:id`, `PATCH tasks/:id/status`, `POST tasks/:id/assign`, `GET tasks/calendar` |
| Collaboration | `GET/POST tasks/:id/comments`, `PATCH/DELETE comments/:id`, `GET/POST tasks/:id/links`, `DELETE links/:id`, `GET tasks/:id/activity` |
| Notifications | `GET/PATCH notifications`, `POST notifications/read-all`, `POST/DELETE notifications/subscribe` |
| Dashboard | `GET dashboard/stats`, `GET dashboard/workload` |
| Search | `GET search?q=` (tasks and people) |
| Admin | `GET/POST admin/settings`, `GET admin/stats`, `POST/GET sync` |
| Cron | `POST cron/reminders` (requires `x-cron-secret` header, called by `pg_cron`) |

## Reminders

`supabase/cron.sql` schedules two jobs:

- every 15 minutes: mark late tasks `overdue`
- daily at 09:00 IST: deadline reminders (7, 3 and 1 day) and overdue alerts through `/api/cron/reminders`

Free Supabase projects pause after 7 days of inactivity, which stops these jobs.

## Known limitations (v0.1)

- No automated tests yet.
- Browser push needs a real push subscription and was not covered by the manual end-to-end run.
- Completing a task is currently a one-step action; a review/approval step is planned next.

## License

MIT License
