'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import Link from 'next/link';
import { Avatar, Chip, Empty, Icon, Pri } from '@/components/ui/kit';

interface Task {
  id: string;
  title: string;
  deadline: string;
  status: string;
  priority: string;
  assigned_to: string;
  assigned_to_name?: string;
}

interface CalendarViewProps {
  tasks: Task[];
}

type Mode = 'month' | 'week' | 'agenda';

const STATUS_KEY: Record<string, string> = {
  pending: 'pend',
  in_progress: 'prog',
  in_review: 'rev',
  completed: 'done',
  overdue: 'over',
};

function evStyle(status: string): React.CSSProperties {
  const k = STATUS_KEY[status] || 'pend';
  return { background: `var(--s-${k}-bg)`, color: `var(--s-${k}-fg)` };
}

function dotColor(status: string): string {
  return `var(--s-${STATUS_KEY[status] || 'pend'}-dot)`;
}

const nowMs = () => Date.now();
const WEEK_OPTS = { weekStartsOn: 1 as const };
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [mode, setMode] = useState<Mode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const days = useMemo(() => {
    if (mode === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, WEEK_OPTS),
        end: endOfWeek(currentDate, WEEK_OPTS),
      });
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), WEEK_OPTS),
      end: endOfWeek(endOfMonth(currentDate), WEEK_OPTS),
    });
  }, [mode, currentDate]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const key = format(new Date(task.deadline), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  const upcoming = useMemo(() => {
    const now = nowMs();
    return tasks
      .filter((t) => t.status !== 'completed' && new Date(t.deadline).getTime() >= now)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [tasks]);

  const agenda = useMemo(() => {
    const start = startOfMonth(currentDate).getTime();
    const end = endOfMonth(currentDate).getTime();
    return tasks
      .filter((t) => {
        const ts = new Date(t.deadline).getTime();
        return ts >= start && ts <= end;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [tasks, currentDate]);

  const selectedDayTasks = tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [];

  const step = (dir: 1 | -1) => {
    if (mode === 'week') setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
        <div className="seg" role="tablist" aria-label="Calendar view">
          {(['month', 'week', 'agenda'] as Mode[]).map((m) => (
            <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-h">
          <div className="row">
            <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Previous" onClick={() => step(-1)}>
              <Icon name="left" size={16} />
            </button>
            <h2 className="t-h2" style={{ minWidth: 150, textAlign: 'center' }}>
              {mode === 'week'
                ? `${format(days[0], 'd MMM')} – ${format(days[days.length - 1], 'd MMM yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </h2>
            <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Next" onClick={() => step(1)}>
              <Icon name="right" size={16} />
            </button>
          </div>
          <div className="row wrap m-hide" style={{ gap: 14 }}>
            <span className="legend"><i style={{ background: 'var(--s-pend-dot)' }} />Pending</span>
            <span className="legend"><i style={{ background: 'var(--s-prog-dot)' }} />In progress</span>
            <span className="legend"><i style={{ background: 'var(--s-done-dot)' }} />Done</span>
            <span className="legend"><i style={{ background: 'var(--s-over-dot)' }} />Overdue</span>
          </div>
          <button type="button" className="btn btn-sm" onClick={goToday}>Today</button>
        </div>

        {mode === 'agenda' ? (
          agenda.length === 0 ? (
            <Empty icon="cal" title="Nothing due this month" text="Tasks with deadlines in this month appear here." />
          ) : (
            agenda.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="row"
                style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', gap: 12 }}
              >
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(t.status), display: 'block', flex: 'none' }} />
                <div className="col grow" style={{ minWidth: 0 }}>
                  <b className="trunc" style={{ fontWeight: 500 }}>{t.title}</b>
                  <span className="t-xs muted">{format(new Date(t.deadline), 'EEE d MMM, HH:mm')}</span>
                </div>
                <Pri level={t.priority} />
                {t.assigned_to_name ? <Avatar name={t.assigned_to_name} size="sm" /> : null}
              </Link>
            ))
          )
        ) : (
          <div className="cal">
            {DOW.map((d) => (
              <div key={d} className="dow">{d}</div>
            ))}
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(key) || [];
              const out = mode === 'month' && !isSameMonth(day, currentDate);
              const today = isSameDay(day, new Date());
              const sel = isSameDay(day, selectedDate);
              const limit = mode === 'week' ? 8 : 2;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={format(day, 'EEEE d MMMM')}
                  className={`day${out ? ' out' : ''}${today ? ' today' : ''}${sel ? ' sel' : ''}`}
                  style={mode === 'week' ? { minHeight: 180 } : undefined}
                  onClick={() => setSelectedDate(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDate(day);
                    }
                  }}
                >
                  <span className="n">{format(day, 'd')}</span>
                  {dayTasks.slice(0, limit).map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="ev"
                      style={evStyle(t.status)}
                      title={t.title}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.title}
                    </Link>
                  ))}
                  {dayTasks.length > limit ? <span className="t-xs muted">+{dayTasks.length - limit} more</span> : null}
                  {dayTasks.length > 0 ? (
                    <span className="show-m" style={{ gap: 3, display: 'flex' }}>
                      {dayTasks.slice(0, 3).map((t) => (
                        <i key={t.id} style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(t.status), display: 'block' }} />
                      ))}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mode !== 'agenda' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-h">
            <h2 className="t-h2">{format(selectedDate, 'EEEE, d MMM')}</h2>
          </div>
          {selectedDayTasks.length === 0 ? (
            <p className="t-sm muted" style={{ padding: '4px 20px 18px' }}>No tasks due.</p>
          ) : (
            selectedDayTasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="row"
                style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', gap: 12 }}
              >
                <div className="col grow" style={{ minWidth: 0 }}>
                  <b className="trunc" style={{ fontWeight: 500 }}>{t.title}</b>
                  <span className="t-xs muted">
                    {format(new Date(t.deadline), 'HH:mm')}
                    {t.assigned_to_name ? ` · ${t.assigned_to_name}` : ''}
                  </span>
                </div>
                <Pri level={t.priority} />
                <Chip status={t.status} />
              </Link>
            ))
          )}
        </div>
      ) : null}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-h">
          <h2 className="t-h2">Coming up</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="t-sm muted" style={{ padding: '4px 20px 18px' }}>No upcoming deadlines.</p>
        ) : (
          upcoming.map((t) => (
            <Link
              key={t.id}
              href={`/tasks/${t.id}`}
              className="row"
              style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', gap: 12 }}
            >
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(t.status), display: 'block', flex: 'none' }} />
              <div className="col grow" style={{ minWidth: 0 }}>
                <b className="trunc" style={{ fontWeight: 500 }}>{t.title}</b>
                <span className="t-xs muted">{format(new Date(t.deadline), 'EEE d MMM, HH:mm')}</span>
              </div>
              {t.assigned_to_name ? <Avatar name={t.assigned_to_name} size="sm" /> : null}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
