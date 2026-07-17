# Google Calendar Sync - Implementation Plan

## Overview
Enable users to sync their ADSE Hub tasks and deadlines with Google Calendar, providing a unified view of work across platforms.

## Architecture

### Option A: One-way Sync (Hub → Calendar)
- Tasks created/updated in ADSE Hub automatically appear in Google Calendar
- Simpler to implement, lower maintenance
- **Recommended for MVP**

### Option B: Two-way Sync (Hub ↔ Calendar)
- Changes in either platform sync to the other
- More complex, requires conflict resolution
- Future enhancement

## Implementation Details

### 1. Google Calendar API Setup
- Enable Google Calendar API in Google Cloud Console
- Create OAuth 2.0 credentials (Web Application)
- Add redirect URI: `{APP_URL}/api/auth/google/callback`
- Required scopes:
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/calendar.readonly`

### 2. Authentication Flow
```
User clicks "Connect Google Calendar"
  ↓
Redirect to Google OAuth consent screen
  ↓
User grants access
  ↓
Callback receives authorization code
  ↓
Exchange code for access + refresh tokens
  ↓
Store tokens securely (encrypted in database)
  ↓
User can now sync tasks
```

### 3. Database Schema Addition
```sql
-- Add to users table or create new table
ALTER TABLE users ADD COLUMN google_calendar_token JSONB;
ALTER TABLE users ADD COLUMN google_calendar_id TEXT;
ALTER TABLE users ADD COLUMN google_calendar_sync_enabled BOOLEAN DEFAULT FALSE;
```

### 4. Sync Mechanism

#### When Task is Created:
```typescript
async function syncTaskToCalendar(task: Task, userId: string) {
  const user = await getUserWithCalendarToken(userId);
  if (!user.google_calendar_sync_enabled) return;

  const calendarEvent = {
    summary: task.title,
    description: task.description,
    start: { date: task.deadline.split('T')[0] },
    end: { date: task.deadline.split('T')[0] },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
  };

  await google.calendar('v3').events.insert({
    calendarId: user.google_calendar_id || 'primary',
    resource: calendarEvent,
  });
}
```

#### When Task is Updated:
- Find corresponding calendar event by `extendedProperties.private.taskId`
- Update event with new details

#### When Task is Deleted:
- Find and delete corresponding calendar event

### 5. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | GET | Initiate OAuth flow |
| `/api/auth/google/callback` | GET | Handle OAuth callback |
| `/api/calendar/sync` | POST | Sync all tasks to calendar |
| `/api/calendar/sync/:taskId` | POST | Sync single task |
| `/api/calendar/disconnect` | POST | Disconnect calendar |

### 6. UI Components

#### Settings Section:
```tsx
<CalendarSyncSection>
  <ConnectButton />  {/* "Connect Google Calendar" */}
  <SyncStatus />     {/* Last synced: X minutes ago */}
  <SyncButton />     {/* "Sync Now" */}
  <DisconnectButton />
</CalendarSyncSection>
```

#### Task Card Addition:
```tsx
{task.google_calendar_event_id && (
  <span className="text-xs text-muted-foreground">
    Synced to Calendar ✓
  </span>
)}
```

### 7. Error Handling
- Token expired → Auto-refresh using refresh token
- Refresh token expired → Prompt user to reconnect
- API rate limit → Queue and retry with exponential backoff
- Calendar not found → Fall back to primary calendar

### 8. Security Considerations
- Store tokens encrypted at rest
- Never expose tokens to client-side
- Use short-lived access tokens with refresh
- Implement token rotation
- Add audit log for sync operations

### 9. User Experience
- **Auto-sync**: Optionally sync new tasks automatically
- **Manual sync**: Button to sync all tasks at once
- **Sync status**: Show which tasks are synced
- **Conflict handling**: Calendar changes don't affect Hub tasks (one-way)
- **Selective sync**: Choose which task types to sync

### 10. Testing Checklist
- [ ] OAuth flow works end-to-end
- [ ] Tasks appear in Google Calendar after creation
- [ ] Updated tasks reflect in Calendar
- [ ] Deleted tasks remove from Calendar
- [ ] Token refresh works seamlessly
- [ ] Disconnect removes all synced events
- [ ] Multiple users can sync independently
- [ ] Error states display properly

## Estimated Effort
- **Backend (OAuth + Sync)**: 2-3 days
- **Frontend (UI + Settings)**: 1-2 days
- **Testing + Polish**: 1 day
- **Total**: 4-6 days

## Priority
- **High value**: Users get calendar integration without leaving their workflow
- **Medium complexity**: Standard OAuth + API integration
- **Recommended**: Implement as Option A (one-way sync) first

## Future Enhancements
- Two-way sync with conflict resolution
- Multiple calendar support
- Custom sync rules (e.g., only high-priority tasks)
- Calendar color coding by task type
- Meeting link integration (Google Meet)
