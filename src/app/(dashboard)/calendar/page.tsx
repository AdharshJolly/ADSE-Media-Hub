'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import CalendarView from '@/components/Calendar/CalendarView';
import { PageHead } from '@/components/ui/kit';
import { Skeleton } from '@/components/ui/skeleton';

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
        if (data.success) setTasks(data.tasks);
      } catch {
        toast.error('Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <>
      <PageHead title="Calendar" sub="Task deadlines across the team." />
      {loading ? <Skeleton style={{ height: 520, borderRadius: 16 }} /> : <CalendarView tasks={tasks} />}
    </>
  );
}
