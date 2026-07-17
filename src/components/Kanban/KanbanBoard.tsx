'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Task } from '@/types/database';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  canEdit: boolean;
}

interface Column {
  id: string;
  title: string;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  { id: 'pending', title: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  { id: 'in_progress', title: 'In Progress', color: 'text-primary', bgColor: 'bg-primary/10' },
  { id: 'completed', title: 'Completed', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  { id: 'overdue', title: 'Overdue', color: 'text-red-600', bgColor: 'bg-red-500/10' },
];

export default function KanbanBoard({ tasks, onStatusChange, canEdit }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getTasksByStatus = useCallback((status: string) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canEdit) return;
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    if (!canEdit || !draggedTask) return;
    e.preventDefault();
    setDragOverColumn(null);

    const task = tasks.find(t => t.id === draggedTask);
    if (task && task.status !== columnId) {
      await onStatusChange(draggedTask, columnId);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'border-l-rose-500',
      high: 'border-l-orange-500',
      medium: 'border-l-blue-500',
      low: 'border-l-slate-400',
    };
    return colors[priority] || 'border-l-slate-400';
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.id);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-72 bg-muted/30 rounded-xl p-3 transition-colors duration-200 ${
              isDragOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold ${column.color}`}>{column.title}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Task Cards */}
            <div className="space-y-2 min-h-[100px]">
              {columnTasks.map(task => {
                const daysRemaining = getDaysRemaining(task.deadline);
                const isDragging = draggedTask === task.id;

                return (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm hover:shadow-md border-l-4 ${getPriorityColor(task.priority)} ${
                      isDragging ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <Link href={`/tasks/${task.id}`} className="block">
                      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                        {task.title}
                      </h4>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(task.deadline), 'MMM d')}
                        </span>
                        {task.status !== 'completed' && (
                          <span className={`font-medium ${
                            daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 3 ? 'text-orange-500' : 'text-muted-foreground'
                          }`}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d late` : daysRemaining === 0 ? 'Today' : `${daysRemaining}d`}
                          </span>
                        )}
                      </div>

                      {task.media_type && (
                        <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium rounded bg-purple-500/10 text-purple-500">
                          {task.media_type.replace('_', ' ')}
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}

              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
