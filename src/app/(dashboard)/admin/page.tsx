'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Chip, Icon, PageHead, Switch, fmtDate } from '@/components/ui/kit';
import type { IconName } from '@/components/ui/kit';
import { CardSkeleton, StatCardSkeleton } from '@/components/ui/skeleton';

interface SystemStats {
  users: { total: number; active: number; pending: number };
  tasks: { total: number; active: number; completed: number };
  requests: { total: number; pending: number; approved: number };
}

interface SystemSettings {
  maintenanceMode: boolean;
  emailNotifications: boolean;
}

const ACTIONS: Array<{ href: string; label: string; sub: string; icon: IconName }> = [
  { href: '/users', label: 'Manage users', sub: 'Add people, deactivate accounts', icon: 'users' },
  { href: '/tasks', label: 'View tasks', sub: 'All tasks across the team', icon: 'tasks' },
  { href: '/requests', label: 'Review requests', sub: 'Pending media requests', icon: 'inbox' },
];

export default function AdminPage() {
  const { canManageUsers } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    emailNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [counts, setCounts] = useState<{ users: number; requests: number; tasks: number } | null>(null);

  // Redirect if not coordinator
  useEffect(() => {
    if (!canManageUsers && !loading) {
      router.push('/dashboard');
      toast.error('Access denied');
    }
  }, [canManageUsers, loading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      console.error('Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { if (d.success) setSettings(d.settings); })
      .catch(() => console.error('Failed to fetch settings'));
    fetch('/api/sync')
      .then((r) => r.json())
      .then((d) => { if (d.success) setSheetUrl(d.spreadsheetUrl); })
      .catch(() => {});
  }, [fetchStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSheetUrl(data.spreadsheetUrl);
        setLastSynced(new Date(data.syncedAt));
        setCounts({ users: data.users, requests: data.requests, tasks: data.tasks });
        toast.success(`Synced ${data.users} users, ${data.requests} requests, ${data.tasks} tasks`);
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSettingChange = async (key: keyof SystemSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Setting updated');
      } else {
        setSettings((prev) => ({ ...prev, [key]: !value }));
        toast.error('Failed to update setting');
      }
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !value }));
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHead title="Admin" sub="Platform settings and integrations." />
        <CardSkeleton />
        <div className="grid g2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="Admin" sub="Platform settings and integrations." />

      <div className="card card-p col" style={{ gap: 18 }}>
        <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--s-done-bg)', color: 'var(--s-done-fg)', flex: 'none' }}>
            <Icon name="sheet" size={22} />
          </span>
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <div className="row wrap" style={{ gap: 10 }}>
              <h2 className="t-h2">Google Sheets</h2>
              {sheetUrl ? <Chip status="completed" label="Connected" /> : <Chip status="pending" label="Not synced yet" />}
            </div>
            <p className="t-sm muted">One-way sync from the Hub to your spreadsheet. Runs every hour.</p>
          </div>
        </div>
        <div className="grid g3">
          <div className="col" style={{ gap: 2 }}>
            <span className="eyebrow">Last synced</span>
            <b style={{ fontWeight: 500 }}>{lastSynced ? fmtDate(lastSynced.toISOString()) : 'Not in this session'}</b>
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span className="eyebrow">Tasks</span>
            <b style={{ fontWeight: 500 }} className="mono">{counts ? `${counts.tasks} rows` : '—'}</b>
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span className="eyebrow">Requests</span>
            <b style={{ fontWeight: 500 }} className="mono">{counts ? `${counts.requests} rows` : '—'}</b>
          </div>
        </div>
        <div className="row wrap">
          {sheetUrl ? (
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <Icon name="ext" size={16} /> Open sheet
            </a>
          ) : null}
          <button type="button" className="btn" onClick={handleSync} disabled={syncing}>
            <Icon name="refresh" size={16} /> {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      <div className="grid g2">
        <div className="card card-p row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary-text)', flex: 'none' }}>
            <Icon name="mail" size={18} />
          </span>
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <b style={{ fontWeight: 500 }}>Email notifications</b>
            <p className="t-sm muted">Send status updates and assignments by email.</p>
          </div>
          <Switch
            on={settings.emailNotifications}
            onChange={(v) => handleSettingChange('emailNotifications', v)}
            label="Email notifications"
            disabled={saving}
          />
        </div>
        <div className="card card-p row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--s-pend-bg)', color: 'var(--s-pend-fg)', flex: 'none' }}>
            <Icon name="wrench" size={18} />
          </span>
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <b style={{ fontWeight: 500 }}>Maintenance mode</b>
            <p className="t-sm muted">Block access for everyone except coordinators.</p>
          </div>
          <Switch
            on={settings.maintenanceMode}
            onChange={(v) => handleSettingChange('maintenanceMode', v)}
            label="Maintenance mode"
            disabled={saving}
          />
        </div>
      </div>

      <div className="grid g2">
        <div className="card card-p col" style={{ gap: 10 }}>
          <h2 className="t-h2" style={{ marginBottom: 4 }}>Quick actions</h2>
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="row"
              style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 12, gap: 12, background: 'var(--surface-2)', minHeight: 44 }}
            >
              <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary-text)', flex: 'none' }}>
                <Icon name={a.icon} size={16} />
              </span>
              <div className="col grow" style={{ minWidth: 0 }}>
                <b style={{ fontWeight: 500 }}>{a.label}</b>
                <span className="t-xs muted">{a.sub}</span>
              </div>
              <Icon name="right" size={16} />
            </Link>
          ))}
          <button
            type="button"
            className="row"
            onClick={() => { fetchStats(); toast.success('Statistics refreshed'); }}
            style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 12, gap: 12, background: 'var(--surface-2)', minHeight: 44, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary-text)', flex: 'none' }}>
              <Icon name="refresh" size={16} />
            </span>
            <div className="col grow" style={{ minWidth: 0 }}>
              <b style={{ fontWeight: 500 }}>Refresh data</b>
              <span className="t-xs muted">Update statistics</span>
            </div>
          </button>
        </div>

        <div className="card card-p col" style={{ gap: 4 }}>
          <h2 className="t-h2" style={{ marginBottom: 6 }}>System snapshot</h2>
          <div className="kv"><span>Users</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.users.total ?? 0}</b></div>
          <div className="kv"><span>Active users</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.users.active ?? 0}</b></div>
          <div className="kv"><span>Awaiting first login</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.users.pending ?? 0}</b></div>
          <div className="kv"><span>Tasks</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.tasks.total ?? 0}</b></div>
          <div className="kv"><span>Active tasks</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.tasks.active ?? 0}</b></div>
          <div className="kv"><span>Completed tasks</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.tasks.completed ?? 0}</b></div>
          <div className="kv"><span>Requests</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.requests.total ?? 0}</b></div>
          <div className="kv"><span>Pending requests</span><b className="mono" style={{ fontWeight: 500 }}>{stats?.requests.pending ?? 0}</b></div>
        </div>
      </div>
    </>
  );
}
