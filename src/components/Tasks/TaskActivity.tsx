'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon, fmtAgo } from '@/components/ui/kit';
import type { IconName } from '@/components/ui/kit';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskActivity } from '@/types/database';

interface TaskActivityProps {
  taskId: string;
}

const actionConfig: Record<string, { icon: IconName; label: string }> = {
  created: { icon: 'plus', label: 'created this task' },
  status_changed: { icon: 'right', label: 'changed status' },
  assigned: { icon: 'user', label: 'assigned a team member' },
  commented: { icon: 'msg', label: 'added a comment' },
  link_added: { icon: 'link', label: 'added a link' },
};

function formatDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return '';
  switch (action) {
    case 'status_changed':
      return `from "${details.from}" to "${details.to}"`;
    case 'assigned':
      return `to ${details.assignee_name || 'team member'}`;
    case 'link_added':
      try {
        return details.url ? `(${new URL(details.url as string).hostname})` : '';
      } catch {
        return '';
      }
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
      if (data.success) setActivity(data.activity);
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
    <div className="card card-p col" style={{ gap: 16 }}>
      <h2 className="t-h2">Activity</h2>
      {loading ? (
        <>
          <Skeleton style={{ height: 28 }} />
          <Skeleton style={{ height: 28 }} />
        </>
      ) : activity.length === 0 ? (
        <p className="t-sm muted">No activity yet.</p>
      ) : (
        activity.map((item) => {
          const config = actionConfig[item.action] || actionConfig.created;
          return (
            <div key={item.id} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--muted)', flex: 'none' }}
              >
                <Icon name={config.icon} size={14} />
              </span>
              <div className="col" style={{ minWidth: 0 }}>
                <span className="t-sm">
                  <b style={{ fontWeight: 500 }}>{item.user?.name || 'System'}</b> {config.label} {formatDetails(item.action, item.details)}
                </span>
                <span className="t-xs muted">{fmtAgo(item.created_at)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
