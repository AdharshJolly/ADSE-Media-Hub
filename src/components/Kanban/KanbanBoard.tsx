'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Icon, Pri, TypeTag, fmtDate } from '@/components/ui/kit';
import type { Task } from '@/types/database';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  canEdit: boolean;
}

const columns = [
  { id: 'pending', title: 'Pending', dot: 'pend' },
  { id: 'in_progress', title: 'In progress', dot: 'prog' },
  { id: 'completed', title: 'Completed', dot: 'done' },
  { id: 'overdue', title: 'Overdue', dot: 'over' },
];

export default function KanbanBoard({ tasks, onStatusChange, canEdit }: KanbanBoardProps) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const onDrop = async (e: React.DragEvent, col: string) => {
    if (!canEdit || !dragged) return;
    e.preventDefault();
    setOverCol(null);
    const task = tasks.find((t) => t.id === dragged);
    setDragged(null);
    if (task && task.status !== col) await onStatusChange(task.id, col);
  };

  return (
    <div className="kan">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        return (
          <section
            key={col.id}
            className={`kcol${overCol === col.id ? ' over' : ''}`}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setOverCol(col.id);
            }}
            onDragLeave={() => setOverCol(null)}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <header>
              <span className="row" style={{ gap: 8 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--s-${col.dot}-dot)`, display: 'block' }} />
                {col.title}
              </span>
              <span className="t-xs muted mono">{items.length}</span>
            </header>
            {items.map((t) => {
              const unassigned = t.assigned_to === t.created_by && t.status === 'pending';
              const late = t.status === 'overdue';
              return (
                <div
                  key={t.id}
                  className={`kcard${dragged === t.id ? ' dragging' : ''}`}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    if (!canEdit) return;
                    setDragged(t.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDragged(null);
                    setOverCol(null);
                  }}
                >
                  <Link href={`/tasks/${t.id}`} className="sp" style={{ alignItems: 'flex-start' }}>
                    <b style={{ fontWeight: 500, lineHeight: 1.35 }}>{t.title}</b>
                  </Link>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <TypeTag type={t.media_type} />
                    <Pri level={t.priority} />
                  </div>
                  <div className="sp">
                    <span className="row t-xs" style={{ gap: 6, color: late ? 'var(--s-over-fg)' : 'var(--muted)' }}>
                      <Icon name="clock" size={14} />
                      {late ? 'Was ' : t.status === 'completed' ? 'Done ' : ''}
                      {fmtDate(t.status === 'completed' ? t.completion_date || t.deadline : t.deadline, t.status !== 'completed')}
                    </span>
                    <span className="row" style={{ gap: 6 }}>
                      <span className="t-xs muted">{unassigned ? 'Unassigned' : t.assignee?.name || ''}</span>
                      {unassigned ? <span className="av sm">+</span> : <Avatar name={t.assignee?.name || '?'} size="sm" />}
                    </span>
                  </div>
                </div>
              );
            })}
            {items.length === 0 ? <p className="t-sm muted" style={{ textAlign: 'center', padding: '16px 0' }}>No tasks</p> : null}
          </section>
        );
      })}
    </div>
  );
}
