# Media Team Portal

A comprehensive task management system for media teams, built with Next.js at the repository root and Google Apps Script backend automation.

## Features

- **User Management**: Role-based access control (Coordinator, Student Head, Requestor, Team Member)
- **Request System**: Faculty can submit media work requests
- **Task Management**: Create, assign, and track tasks with deadlines
- **Notification System**: Email reminders sent through a Google Apps Script mail endpoint
- **Dashboard**: Visual overview of tasks, workload, and statistics

## Tech Stack

- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Google Apps Script
- **Email Delivery**: Google Apps Script MailApp endpoint
- **Database**: Google Sheets
- **Deployment**: Vercel (Frontend) + Google Apps Script (Backend)

## Project Structure

```
media-team-portal/
├── legacy/backend/Code.gs      # Main Apps Script entry point
├── legacy/backend/EmailService.gs # MailApp email sender
├── src/                        # Next.js application source
├── public/                     # Static assets
├── package.json                # App dependencies and scripts
├── next.config.ts              # Next.js configuration
└── SETUP.md                    # Setup instructions
```

## Setup Instructions

### 1. Google Sheets Setup

1. Create a new Google Spreadsheet
2. Rename the default sheet to "Users"
3. Add the following sheets:
   - Requests
   - Tasks
   - Notifications
   - Sessions
4. Add column headers to each sheet (see database schema below)
5. Copy the Spreadsheet ID from the URL

### 2. Google Apps Script Setup

1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Create the following files and paste the code from `legacy/backend/`:
   - Code.gs
   - EmailService.gs
4. Update `CONFIG.SPREADSHEET_ID` in Code.gs with your Spreadsheet ID
5. Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone
6. Copy the Web App URL
7. Set an Apps Script Script Property:
   - `EMAIL_API_KEY`: shared secret used by the Next.js app when sending email

### 3. Frontend Setup

1. Open the repository root.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` file:

   ```
   VITE_API_URL=your_google_apps_script_web_app_url
   GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL=your_google_apps_script_email_web_app_url
   GOOGLE_APPS_SCRIPT_EMAIL_API_KEY=shared_secret_for_email_endpoint
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### 4. Deployment to Vercel

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variable:
   - `VITE_API_URL`: Your Google Apps Script Web App URL
4. Deploy

## Database Schema

### Users Sheet

| Column        | Type     | Description                                       |
| ------------- | -------- | ------------------------------------------------- |
| user_id       | string   | Unique identifier (USR-YYYYMMDD-XXX)              |
| email         | string   | Email address                                     |
| password_hash | string   | SHA-256 hashed password                           |
| name          | string   | Full name                                         |
| role          | enum     | coordinator, student_head, requestor, team_member |
| skills        | string   | Comma-separated skills                            |
| is_active     | boolean  | Account active status                             |
| is_approved   | boolean  | Registration approved                             |
| created_at    | datetime | Account creation date                             |

### Requests Sheet

| Column            | Type     | Description                                   |
| ----------------- | -------- | --------------------------------------------- |
| request_id        | string   | Unique identifier (REQ-YYYYMMDD-XXX)          |
| requestor_id      | string   | FK to Users                                   |
| title             | string   | Request title                                 |
| description       | string   | Work description                              |
| media_type        | enum     | graphic_design, photography, video_production |
| event_name        | string   | Associated event                              |
| target_platform   | string   | Where content will be used                    |
| style_reference   | string   | Google Drive link                             |
| deadline          | datetime | Desired completion date                       |
| priority          | enum     | low, medium, high, urgent                     |
| status            | enum     | pending, approved, rejected, completed        |
| coordinator_notes | string   | Notes from coordinator                        |
| created_at        | datetime | Request creation date                         |
| updated_at        | datetime | Last update date                              |

### Tasks Sheet

| Column          | Type     | Description                                   |
| --------------- | -------- | --------------------------------------------- |
| task_id         | string   | Unique identifier (TASK-YYYYMMDD-XXX)         |
| request_id      | string   | FK to Requests                                |
| created_by      | string   | FK to Users (coordinator/head)                |
| assigned_to     | string   | FK to Users (team member)                     |
| title           | string   | Task title                                    |
| description     | string   | Task description                              |
| media_type      | enum     | graphic_design, photography, video_production |
| priority        | enum     | low, medium, high, urgent                     |
| deadline        | datetime | Task deadline                                 |
| status          | enum     | pending, in_progress, completed, overdue      |
| completion_date | datetime | Completion timestamp                          |
| notes           | string   | Additional notes                              |
| created_at      | datetime | Task creation date                            |
| updated_at      | datetime | Last update date                              |

### Notifications Sheet

| Column          | Type     | Description                                          |
| --------------- | -------- | ---------------------------------------------------- |
| notification_id | string   | Unique identifier                                    |
| recipient_id    | string   | FK to Users                                          |
| type            | enum     | task_assigned, reminder_Xday, overdue, status_update |
| title           | string   | Notification title                                   |
| message         | string   | Notification content                                 |
| related_task_id | string   | FK to Tasks                                          |
| is_read         | boolean  | Read status                                          |
| created_at      | datetime | Creation timestamp                                   |

### Sessions Sheet

| Column     | Type     | Description          |
| ---------- | -------- | -------------------- |
| session_id | string   | Unique identifier    |
| user_id    | string   | FK to Users          |
| token      | string   | Session token        |
| expires_at | datetime | Expiration timestamp |
| created_at | datetime | Creation timestamp   |

## User Roles

| Role             | Permissions                                                      |
| ---------------- | ---------------------------------------------------------------- |
| **Coordinator**  | Full access: manage users, approve requests, create/assign tasks |
| **Student Head** | Create tasks, assign to team, view workload, handle requests     |
| **Requestor**    | Submit requests, view own request status                         |
| **Team Member**  | View assigned tasks, update task status                          |

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Requests

- `GET /api/requests` - List requests
- `POST /api/requests` - Create request
- `PUT /api/requests/:id` - Update request
- `PATCH /api/requests/:id/approve` - Approve request
- `PATCH /api/requests/:id/reject` - Reject request

### Tasks

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update status
- `DELETE /api/tasks/:id` - Delete task

### Notifications

- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read

### Dashboard

- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/workload` - Get team workload

## Reminder System

The system automatically sends email reminders at:

- 7 days before deadline
- 3 days before deadline
- 1 day before deadline

Overdue tasks are automatically marked and notifications are sent to:

- The assigned team member
- Coordinators/Student Heads

## License

MIT License
