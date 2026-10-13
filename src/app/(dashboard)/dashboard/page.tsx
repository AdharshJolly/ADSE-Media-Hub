'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { StatCardSkeleton, ListSkeleton } from '@/components/ui/skeleton';
import { TaskStatusChart, RequestStatusChart, Donut, Legend, taskSegments } from '@/components/ui/charts';
import { Avatar, Chip, Icon, MEDIA_LABEL, PageHead, Pri, Stat, fmtAgo, fmtDate, type IconName } from '@/components/ui/kit';
import type { DashboardStats, Notification, Request, Task, Workload } from '@/types/database';

type Req = Request & { tasks?: { id: string; status: string }[] };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function today() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function firstName(name?: string) {
  return (name || '').split(' ')[0];
}

async function getJson(url: string) {
  try {
    const r = await fetch(url);
    return await r.json();
  } catch {
    return { success: false };
  }
}

function QuickAction({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className="row" style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 12, gap: 12, background: 'var(--surface-2)', minHeight: 44 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary-text)' }}>
        <Icon name={icon} />
      </span>
      <b className="grow" style={{ fontWeight: 500 }}>{label}</b>
      <Icon name="right" style={{ color: 'var(--faint)' }} />
    </Link>
  );
}

function WorkloadCard({ workload, link }: { workload: Workload[]; link?: boolean }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-h">
        <h2 className="t-h2">Team workload</h2>
        {link ? <Link className="lnk t-sm" href="/users">View all</Link> : null}
      </div>
      {workload.length === 0 ? (
        <p className="muted t-sm" style={{ padding: 20 }}>No team members yet.</p>
      ) : (
        workload.slice(0, 5).map((m) => (
          <div key={m.user_id} className="row wrap" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', gap: 12 }}>
            <Avatar name={m.name} />
            <div className="col grow" style={{ minWidth: 120 }}>
              <b style={{ fontWeight: 500 }}>{m.name}</b>
              <span className="t-xs muted">{m.total_tasks} total tasks</span>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="tag">{m.in_progress + m.pending} active</span>
              {m.in_review > 0 ? <span className="chip c-rev">{m.in_review} in review</span> : null}
              <span className="tag">{m.completed} done</span>
              {m.overdue > 0 ? <span className="chip c-over">{m.overdue} overdue</span> : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ActivityIcon({ icon, tone }: { icon: IconName; tone: 'done' | 'prog' | 'appr' }) {
  return (
    <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--s-${tone}-bg)`, color: `var(--s-${tone}-fg)`, flex: 'none' }}>
      <Icon name={icon} />
    </span>
  );
}

function UpdatesCard({ title, items }: { title: string; items: Notification[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-h"><h2 className="t-h2">{title}</h2></div>
      {items.length === 0 ? (
        <p className="muted t-sm" style={{ padding: 20 }}>Nothing new yet.</p>
      ) : (
        items.slice(0, 4).map((n) => (
          <div key={n.id} className="li">
            <ActivityIcon icon={/comment/i.test(n.type) ? 'msg' : /assign/i.test(n.type) ? 'user' : 'check'} tone={/comment/i.test(n.type) ? 'prog' : 'done'} />
            <div className="col">
              <span className="t-sm">{n.message || n.title}</span>
              <span className="t-xs muted">{fmtAgo(n.created_at)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const nowMs = () => Date.now();

export default function DashboardPage() {
  const { user, canManageTasks, isCoordinator } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const role = user.role;
    const staff = role === 'coordinator' || role === 'student_head';
    const [s, w, r, t, n] = await Promise.all([
      staff ? getJson('/api/dashboard/stats') : Promise.resolve(null),
      staff ? getJson('/api/dashboard/workload') : Promise.resolve(null),
      role === 'team_member' ? Promise.resolve(null) : getJson(`/api/requests?pageSize=${staff ? 5 : 50}${staff ? '&status=pending' : ''}`),
      role === 'requestor' ? Promise.resolve(null) : getJson('/api/tasks?pageSize=50'),
      role === 'coordinator' || role === 'student_head' ? Promise.resolve(null) : getJson('/api/notifications'),
    ]);
    if (s?.success) setStats(s);
    if (w?.success) setWorkload(w.workload || []);
    if (r?.success) setRequests(r.data || []);
    if (t?.success) setTasks(t.data || []);
    if (n?.success) setNotes(n.notifications || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      const res = await fetch(`/api/requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'approve' ? 'Request approved' : 'Request rejected');
        window.dispatchEvent(new Event('hub:refresh-counts'));
        await load();
      } else {
        toast.error(data.error || 'Could not update request');
      }
    } catch {
      toast.error('Could not update request');
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="col" style={{ gap: 20 }}>
        <PageHead title={`${greeting()}, ${firstName(user.name)}`} sub={today()} />
        <div className="grid g4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <ListSkeleton items={4} />
      </div>
    );
  }

  const role = user.role;
  const ts = stats?.taskStats;
  const rs = stats?.requestStats;

  /* ---------- Requestor ---------- */
  if (role === 'requestor') {
    const count = (s: string) => requests.filter((r) => r.status === s).length;
    return (
      <div className="col" style={{ gap: 20 }}>
        <PageHead
          title={`Hello, ${firstName(user.name)}`}
          sub="Track the media work you asked for."
          actions={<Link href="/requests/new" className="btn btn-primary"><Icon name="plus" />New request</Link>}
        />
        <div className="grid g4">
          <Stat icon="inbox" label="My requests" value={requests.length} />
          <Stat icon="clock" label="Pending review" value={count('pending')} />
          <Stat icon="check" label="Approved" value={count('approved')} />
          <Stat icon="trend" label="Completed" value={count('completed')} />
        </div>
        <div className="split">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-h">
              <h2 className="t-h2">Recent requests</h2>
              <Link className="lnk t-sm" href="/requests">View all</Link>
            </div>
            {requests.length === 0 ? (
              <p className="muted t-sm" style={{ padding: 20 }}>You have not submitted any requests yet.</p>
            ) : (
              requests.slice(0, 4).map((r) => (
                <Link key={r.id} href="/requests" className="row wrap" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                  <div className="col grow" style={{ minWidth: 160 }}>
                    <b style={{ fontWeight: 500 }}>{r.title}</b>
                    <span className="t-xs muted">{r.event_name || MEDIA_LABEL[r.media_type] || r.media_type}</span>
                  </div>
                  <Chip status={r.status} />
                </Link>
              ))
            )}
          </div>
          <div className="col" style={{ gap: 16, minWidth: 0 }}>
            <div className="card card-p col" style={{ gap: 12 }}>
              <h2 className="t-h2">Need something made?</h2>
              <p className="t-sm muted">Describe it once. The coordinator assigns it to a team member.</p>
              <Link href="/requests/new" className="btn btn-primary btn-block"><Icon name="send" />Submit a request</Link>
            </div>
            <UpdatesCard title="Latest updates" items={notes} />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Team member ---------- */
  if (role === 'team_member') {
    const mine = tasks;
    const done = mine.filter((t) => t.status === 'completed').length;
    const active = mine.filter((t) => t.status === 'in_progress').length;
    const inReview = mine.filter((t) => t.status === 'in_review').length;
    const over = mine.filter((t) => t.status === 'overdue').length;
    const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
    const next = mine
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
      .slice(0, 4);
    const segs = [
      { label: 'Done', value: done, color: 'var(--s-done-dot)' },
      { label: 'Active', value: active, color: 'var(--s-prog-dot)' },
      { label: 'Overdue', value: over, color: 'var(--s-over-dot)' },
    ];
    return (
      <div className="col" style={{ gap: 20 }}>
        <PageHead
          title={`${greeting()}, ${firstName(user.name)}`}
          sub={`You have ${active} task${active === 1 ? '' : 's'} in progress${inReview ? `, ${inReview} in review` : ''} and ${over} overdue.`}
          actions={<Link href="/tasks" className="btn btn-primary"><Icon name="tasks" />Open my tasks</Link>}
        />
        <div className="grid g4">
          <Stat icon="tasks" label="My tasks" value={mine.length} />
          <Stat icon="clock" label="In progress" value={active} />
          <Stat icon="check" label="Completed" value={done} />
          <Stat icon="alert" label="Overdue" value={over} note="Past its deadline" />
        </div>
        <div className="split">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-h"><h2 className="t-h2">Up next</h2></div>
            {next.length === 0 ? (
              <p className="muted t-sm" style={{ padding: 20 }}>Nothing assigned right now.</p>
            ) : (
              next.map((t) => (
                <div key={t.id} className="row wrap" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                  <div className="col grow" style={{ minWidth: 170, gap: 6 }}>
                    <Link href={`/tasks/${t.id}`}><b style={{ fontWeight: 500 }}>{t.title}</b></Link>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <span className="tag">{MEDIA_LABEL[t.media_type as keyof typeof MEDIA_LABEL] || t.media_type}</span>
                      <Pri level={t.priority} />
                      <span className="row t-xs muted" style={{ gap: 6 }}>
                        <Icon name="clock" size={14} />
                        {t.status === 'overdue' ? 'Was ' : ''}{fmtDate(t.deadline)}
                      </span>
                    </div>
                  </div>
                  <Chip status={t.status} />
                  <Link href={`/tasks/${t.id}`} className={`btn btn-sm ${t.status === 'pending' ? 'btn-primary' : ''}`}>
                    {t.status === 'pending' ? 'Start' : 'Update'}
                  </Link>
                </div>
              ))
            )}
          </div>
          <div className="col" style={{ gap: 16, minWidth: 0 }}>
            <div className="card card-p col" style={{ gap: 14 }}>
              <h2 className="t-h2">My progress</h2>
              <div className="row" style={{ gap: 18 }}>
                <Donut segments={segs} size={96} center={`${pct}%`} />
                <Legend segments={segs} />
              </div>
            </div>
            <UpdatesCard title="Recent activity" items={notes} />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Coordinator / Student head ---------- */
  const isHead = role === 'student_head';
  const pending = requests.filter((r) => r.status === 'pending');
  const weekEnd = nowMs() + 7 * 86400000;
  const dueSoon = tasks
    .filter((t) => t.status !== 'completed' && +new Date(t.deadline) <= weekEnd)
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, 4);
  const completedPct = ts?.total ? Math.round((ts.completed / ts.total) * 100) : 0;
  const urgent = pending.filter((r) => r.priority === 'urgent').length;

  return (
    <div className="col" style={{ gap: 20 }}>
      <PageHead
        title={`${greeting()}, ${firstName(user.name)}`}
        sub={
          isHead
            ? `${today()}. ${rs?.pending || 0} request${rs?.pending === 1 ? '' : 's'} need your decision.`
            : `${today()}. ${ts?.overdue || 0} task${ts?.overdue === 1 ? ' is' : 's are'} overdue.`
        }
        actions={
          isHead ? (
            <Link href="/requests" className="btn btn-primary"><Icon name="inbox" />Review requests</Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => router.push('/tasks/new')}><Icon name="plus" />New task</button>
          )
        }
      />
      <div className="grid g4">
        <Stat icon="clock" label="In progress" value={ts?.in_progress || 0} />
        <Link href="/tasks?status=needs_review" style={{ display: 'contents' }}>
          <Stat icon="check" label="Needs review" value={ts?.needs_review || 0} note={ts?.needs_review ? 'Waiting for approval' : undefined} />
        </Link>
        <Stat icon="check" label="Completed" value={ts?.completed || 0} note={ts?.total ? `${completedPct}% of all tasks` : undefined} />
        <Stat icon="alert" label="Overdue" value={ts?.overdue || 0} note="Needs attention" />
      </div>
      {!isHead && (
        <div className="grid g3">
          <Stat icon="inbox" label="Pending requests" value={rs?.pending || 0} note={urgent ? `${urgent} urgent` : undefined} />
          <Stat icon="users" label="Team members" value={stats?.userStats?.teamMembers || 0} />
          <Stat icon="key" label="Awaiting first login" value={stats?.userStats?.awaitingFirstLogin ?? 0} />
        </div>
      )}
      <div className="split">
        <div className="col" style={{ gap: 16, minWidth: 0 }}>
          {isHead ? (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-h">
                <h2 className="t-h2">Waiting for your approval</h2>
                <Link className="lnk t-sm" href="/requests">All requests</Link>
              </div>
              {pending.length === 0 ? (
                <p className="muted t-sm" style={{ padding: 20 }}>No requests are waiting.</p>
              ) : (
                pending.map((r) => (
                  <div key={r.id} className="row wrap" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                    <div className="col grow" style={{ minWidth: 160 }}>
                      <b style={{ fontWeight: 500 }}>{r.title}</b>
                      <span className="t-xs muted">
                        {MEDIA_LABEL[r.media_type] || r.media_type} · by {r.requestor?.name || 'Unknown'} · {fmtDate(r.deadline)}
                      </span>
                    </div>
                    <Pri level={r.priority} />
                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="btn btn-sm btn-ok" disabled={busy === r.id} onClick={() => decide(r.id, 'approve')}>Approve</button>
                      <button type="button" className="btn btn-sm btn-danger" disabled={busy === r.id} onClick={() => decide(r.id, 'reject')}>Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
          {isHead ? (
            <div className="grid g2">
              <div className="card card-p col" style={{ gap: 14 }}>
                <h2 className="t-h2">Request status</h2>
                {rs ? <RequestStatusChart stats={rs} /> : null}
              </div>
              <div className="card card-p col" style={{ gap: 14 }}>
                <h2 className="t-h2">Task status</h2>
                <Legend segments={taskSegments(ts!)} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid g2">
                <div className="card card-p col" style={{ gap: 16 }}>
                  <h2 className="t-h2">Task status</h2>
                  {ts ? <TaskStatusChart stats={ts} /> : null}
                </div>
                <div className="card card-p col" style={{ gap: 16 }}>
                  <h2 className="t-h2">Request status</h2>
                  {rs ? <RequestStatusChart stats={rs} /> : null}
                </div>
              </div>
              <WorkloadCard workload={workload} link />
            </>
          )}
        </div>
        <div className="col" style={{ gap: 16, minWidth: 0 }}>
          {isHead ? <WorkloadCard workload={workload} /> : null}
          <div className="card card-p col" style={{ gap: 10 }}>
            <h2 className="t-h2" style={{ marginBottom: 4 }}>Quick actions</h2>
            {canManageTasks ? <QuickAction href="/tasks/new" icon="plus" label="Create new task" /> : null}
            {isCoordinator ? <QuickAction href="/users" icon="users" label="Manage users" /> : null}
            <QuickAction href="/requests/new" icon="send" label="Submit request" />
          </div>
          {!isHead ? (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-h"><h2 className="t-h2">Due this week</h2></div>
              {dueSoon.length === 0 ? (
                <p className="muted t-sm" style={{ padding: 20 }}>Nothing due in the next 7 days.</p>
              ) : (
                dueSoon.map((t) => (
                  <Link key={t.id} href={`/tasks/${t.id}`} className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                    <div className="col grow" style={{ minWidth: 0 }}>
                      <b className="trunc" style={{ fontWeight: 500 }}>{t.title}</b>
                      <span className="t-xs muted">{fmtDate(t.deadline)}</span>
                    </div>
                    <Avatar name={t.assignee?.name || '?'} size="sm" />
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
