'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { TaskActivity } from '@/types/database';

interface TaskActivityProps {
  taskId: string;
}

const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
  created: { icon: 'plus', label: 'created this task', color: 'text-emerald-500 bg-emerald-500/10' },
  status_changed: { icon: 'arrow', label: 'changed status', color: 'text-primary bg-primary/10' },
  assigned: { icon: 'user', label: 'assigned a team member', color: 'text-purple-500 bg-purple-500/10' },
  commented: { icon: 'message', label: 'added a comment', color: 'text-blue-500 bg-blue-500/10' },
  link_added: { icon: 'link', label: 'added a link', color: 'text-orange-500 bg-orange-500/10' },
};

function ActionIcon({ action, color }: { action: string; color: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    plus: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    arrow: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    ),
    user: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    message: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    link: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  };

  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      {iconMap[action] || iconMap.plus}
    </div>
  );
}

function formatDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return '';

  switch (action) {
    case 'status_changed':
      return `from "${details.from}" to "${details.to}"`;
    case 'assigned':
      return `to ${details.assignee_name || 'team member'}`;
    case 'link_added':
      return details.url ? `(${new URL(details.url as string).hostname})` : '';
    default:
      return '';
  }
}

export default function TaskActivity({ taskId }: TaskActivityProps) {
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/activity`);
      const data = await response.json();
      if (data.success) {
        setActivity(data.activity);
      }
    } catch {
      console.error('Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Activity</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-7 h-7 bg-muted rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-2 w-20 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
      ) : (
        <div className="space-y-4">
          {activity.map(item => {
            const config = actionConfig[item.action] || actionConfig.created;
            return (
              <div key={item.id} className="flex gap-3">
                <ActionIcon action={item.action} color={config.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.user?.name || 'System'}</span>{' '}
                    {config.label}{' '}
                    {formatDetails(item.action, item.details)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
