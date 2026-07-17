'use client';

import { useState, useEffect } from 'react';
import CalendarView from '@/components/Calendar/CalendarView';
import { TableSkeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  deadline: string;
  status: string;
  priority: string;
  assigned_to: string;
  assigned_to_name?: string;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks/calendar');
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);
        }
      } catch {
        toast.error('Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">View tasks and deadlines on a calendar</p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <CalendarView tasks={tasks} />
      )}
    </div>
  );
}
