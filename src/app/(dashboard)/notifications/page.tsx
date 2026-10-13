'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import PushNotificationManager from '@/components/Notifications/PushNotificationManager';
import { Empty, Icon, PageHead, fmtDate } from '@/components/ui/kit';
import type { IconName } from '@/components/ui/kit';
import { ListSkeleton } from '@/components/ui/skeleton';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function iconFor(type: string): { icon: IconName; k: string } {
  const t = (type || '').toLowerCase();
  if (t.startsWith('task')) return { icon: 'tasks', k: 'prog' };
  if (t.includes('rejected')) return { icon: 'x', k: 'over' };
  if (t.includes('approved')) return { icon: 'check', k: 'done' };
  if (t.startsWith('request')) return { icon: 'inbox', k: 'appr' };
  if (t.startsWith('user') || t === 'approval') return { icon: 'userplus', k: 'pend' };
  if (t.includes('comment')) return { icon: 'msg', k: 'prog' };
  return { icon: 'bell', k: 'pend' };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) setNotifications(data.notifications);
    } catch {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new Event('hub:refresh-counts'));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('hub:refresh-counts'));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.is_read : filter === 'read' ? n.is_read : true));

  return (
    <>
      <PageHead
        title="Notifications"
        sub={unreadCount > 0 ? `${unreadCount} unread.` : 'You are all caught up.'}
        actions={
          unreadCount > 0 ? (
            <button type="button" className="btn" onClick={markAllAsRead}>
              <Icon name="check" size={16} /> Mark all as read
            </button>
          ) : null
        }
      />

      <PushNotificationManager />

      <div className="tabs" role="tablist">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
            {f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton items={5} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-h">
            <h2 className="t-h2">Recent</h2>
          </div>
          {filtered.length === 0 ? (
            <Empty icon="bell" title="No notifications" text="You are all caught up." />
          ) : (
            filtered.map((n) => {
              const { icon, k } = iconFor(n.type);
              return (
                <div
                  key={n.id}
                  className={`li${n.is_read ? '' : ' unread'}`}
                  style={{ cursor: n.is_read ? 'default' : 'pointer' }}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <span
                    style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--s-${k}-bg)`, color: `var(--s-${k}-fg)`, flex: 'none' }}
                  >
                    <Icon name={icon} size={18} />
                  </span>
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                    <span className="t-sm" style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.title}</span>
                    <span className="t-sm muted">{n.message}</span>
                    <span className="t-xs muted">{fmtDate(n.created_at)}</span>
                  </div>
                  {!n.is_read ? (
                    <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'block', marginTop: 6, flex: 'none' }} />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
