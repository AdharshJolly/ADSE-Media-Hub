'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import Link from 'next/link';

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

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      const dateKey = format(new Date(task.deadline), 'yyyy-MM-dd');
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(task);
    });
    return map;
  }, [tasks]);

  const selectedDayTasks = selectedDate
    ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500',
      in_progress: 'bg-primary',
      completed: 'bg-emerald-500',
      overdue: 'bg-red-500',
    };
    return colors[status] || 'bg-muted';
  };

  const getPriorityDot = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-rose-500',
      high: 'bg-orange-500',
      medium: 'bg-blue-500',
      low: 'bg-slate-400',
    };
    return colors[priority] || 'bg-slate-400';
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`relative min-h-[80px] p-1.5 text-left rounded-lg transition-all duration-150 ${
                    isSelected
                      ? 'bg-primary/10 border-2 border-primary'
                      : isToday
                      ? 'bg-muted border border-border'
                      : 'hover:bg-muted/50 border border-transparent'
                  } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] text-white truncate ${getStatusColor(task.status)}`}
                        title={task.title}
                      >
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a day'}
          </h3>
          {selectedDate && (
            <div className="space-y-2">
              {selectedDayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks due</p>
              ) : (
                selectedDayTasks.map(task => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)}`} />
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{task.status.replace('_', ' ')}</p>
                    {task.assigned_to_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">Assigned to: {task.assigned_to_name}</p>
                    )}
                  </Link>
                ))
              )}
            </div>
          )}
          {!selectedDate && (
            <p className="text-sm text-muted-foreground">Click a day to see tasks</p>
          )}
        </div>
      </div>
    </div>
  );
}
