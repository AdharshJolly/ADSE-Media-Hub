'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'task':
    case 'task_assigned':
    case 'task_status':
      return (
        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0 transition duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      );
    case 'request':
    case 'request_created':
    case 'request_approved':
    case 'request_rejected':
      return (
        <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center flex-shrink-0 transition duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    case 'approval':
    case 'user_registered':
    case 'user_approved':
      return (
        <div className="w-10 h-10 bg-yellow-accent/10 text-yellow-accent rounded-xl flex items-center justify-center flex-shrink-0 transition duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 bg-muted text-muted-foreground rounded-xl flex items-center justify-center flex-shrink-0 transition duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      );
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
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
      setNotifications(
        notifications.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread notifications</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm font-semibold text-primary hover:text-primary/80 transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-2 shadow-sm">
        {['all', 'unread', 'read'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition duration-200 capitalize cursor-pointer ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {f} {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-lg font-semibold text-foreground">No notifications</p>
            <p className="text-sm mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`p-5 flex items-start space-x-4 cursor-pointer transition-all duration-200 border-l-4 ${
                  !notification.is_read
                    ? 'bg-primary/5 hover:bg-primary/10 border-l-yellow-accent'
                    : 'hover:bg-muted/40 border-l-transparent'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.notification_id)}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className={`font-semibold tracking-tight ${!notification.is_read ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="w-2.5 h-2.5 bg-yellow-accent rounded-full flex-shrink-0 shadow-sm"></span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 leading-relaxed ${!notification.is_read ? 'text-foreground/90' : 'text-muted-foreground/80'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2 font-medium">
                    {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
