'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import KanbanBoard from '@/components/Kanban/KanbanBoard';
import { Avatar, Chip, Empty, Icon, Modal, PageHead, Pri, TypeTag, assigneeLabel, fmtDate, isLate } from '@/components/ui/kit';
import type { Task } from '@/types/database';

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
];

function TasksView() {
  const { user, canManageTasks } = useAuth();
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(params.get('status') || '');
  const [searchQuery, setSearchQuery] = useState(q);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);

  useEffect(() => setSearchQuery(q), [q]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const isTeam = !canManageTasks;
  const paged = canManageTasks && view === 'list';

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (canManageTasks && statusFilter) p.set('status', statusFilter);
      if (debouncedSearch) p.set('search', debouncedSearch);
      p.set('page', paged ? String(page) : '1');
      p.set('pageSize', paged ? '12' : '100');
      const res = await fetch(`/api/tasks?${p}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
      }
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [canManageTasks, statusFilter, debouncedSearch, page, paged]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!canManageTasks) return;
    fetch('/api/users/team-members')
      .then((r) => r.json())
      .then((d) => d.success && setTeamMembers(d.teamMembers))
      .catch(() => console.error('Failed to fetch team members'));
  }, [canManageTasks]);

  useEffect(() => setPage(1), [statusFilter, debouncedSearch, view]);

  const handleSubmitForReview = async (taskId: string) => {
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.status === 'in_review' ? 'Submitted for review' : 'Submitted. Waiting on the other assignees');
        fetchTasks();
      } else {
        toast.error(data.error || 'Failed to submit');
      }
    } catch {
      toast.error('Failed to submit');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    if (newStatus !== 'pending' && newStatus !== 'in_progress') {
      toast.error('Open the task to submit it, approve it or request rework');
      return;
    }
    setBusyId(taskId);
    const original = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t)));
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        setTasks(original);
        toast.error(data.error || 'Failed to update task status');
      } else {
        toast.success('Task status updated');
      }
    } catch {
      setTasks(original);
      toast.error('Failed to update task status');
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = async (taskId: string, assignedTo: string) => {
    if (!assignedTo) return;
    setBusyId(taskId);
    const original = [...tasks];
    const member = teamMembers.find((m) => m.id === assignedTo);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigned_to: assignedTo, assignee: member ? ({ id: member.id, name: member.name } as Task['assignee']) : t.assignee } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      const data = await res.json();
      if (!data.success) {
        setTasks(original);
        toast.error(data.error || 'Failed to assign task');
      } else {
        toast.success(`Task assigned to ${member?.name || 'member'}`);
      }
    } catch {
      setTasks(original);
      toast.error('Failed to assign task');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    setBusyId(id);
    const original = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setTasks(original);
        toast.error(data.error || 'Failed to delete task');
      } else {
        toast.success('Task deleted');
        fetchTasks();
      }
    } catch {
      setTasks(original);
      toast.error('Failed to delete task');
    } finally {
      setBusyId(null);
    }
  };

  const needsAssignment = (t: Task) => canManageTasks && t.assigned_to === t.created_by && t.status === 'pending';
  const mine = (t: Task) => !!user && (t.assignees?.some((a) => a.user_id === user.id) ?? t.assigned_to === user.id);
  const myState = (t: Task) => t.assignees?.find((a) => a.user_id === user?.id)?.state;

  const counts = (id: string) => (id === 'all' ? tasks.length : tasks.filter((t) => t.status === id).length);
  const shown = isTeam ? (tab === 'all' ? tasks : tasks.filter((t) => t.status === tab)) : tasks;

  const sub = isTeam
    ? `${totalCount} ${totalCount === 1 ? 'task' : 'tasks'} ${user?.role === 'requestor' ? 'from your requests' : 'assigned to you'}.`
    : `${totalCount} tasks across the team.`;

  return (
    <>
      <PageHead
        title={isTeam ? (user?.role === 'requestor' ? 'Tasks' : 'My tasks') : 'Tasks'}
        sub={sub}
        actions={
          canManageTasks ? (
            <Link href="/tasks/new" className="btn btn-primary">
              <Icon name="plus" size={16} /> New task
            </Link>
          ) : undefined
        }
      />

      {canManageTasks ? (
        <div className="row wrap" style={{ marginBottom: 16, gap: 12 }}>
          <label className="search grow" style={{ minWidth: 200, maxWidth: 380 }}>
            <Icon name="search" />
            <input className="input" placeholder="Search tasks" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </label>
          <select className="input sel" style={{ width: 190 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="needs_review">In review</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <div className="seg dsk-only">
            <button type="button" className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button>
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
          </div>
        </div>
      ) : (
        <div className="tabs" style={{ marginBottom: 16, overflowX: 'auto' }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label} <span className="mono muted">{counts(t.id)}</span>
            </button>
          ))}
        </div>
      )}

      {loading && tasks.length === 0 ? (
        canManageTasks && view === 'board' ? (
          <TableSkeleton rows={5} />
        ) : isTeam ? (
          <div className="grid g2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <TableSkeleton rows={6} />
        )
      ) : shown.length === 0 ? (
        <div className="card">
          <Empty
            icon="tasks"
            title="No tasks found"
            text={searchQuery || statusFilter ? 'Try a different search or filter.' : 'Tasks will appear here.'}
            action={canManageTasks ? <Link href="/tasks/new" className="btn btn-primary">New task</Link> : undefined}
          />
        </div>
      ) : isTeam ? (
        <div className="grid g2">
          {shown.map((t) => {
            const late = isLate(t);
            return (
              <div key={t.id} className="card card-p col" style={{ gap: 12 }}>
                <div className="sp" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <Link href={`/tasks/${t.id}`} style={{ fontWeight: 600 }}>{t.title}</Link>
                  <Chip status={t.status} />
                </div>
                <div className="row wrap" style={{ gap: 10 }}>
                  <TypeTag type={t.media_type} />
                  <Pri level={t.priority} />
                  <span className="row t-xs" style={{ gap: 6, color: late ? 'var(--s-over-fg)' : 'var(--muted)' }}>
                    <Icon name="clock" size={14} />
                    {fmtDate(t.deadline)}
                  </span>
                </div>
                <div className="sp">
                  <Link href={`/tasks/${t.id}`} className="row t-xs muted" style={{ gap: 6 }}>
                    <Icon name="msg" size={14} />
                    {assigneeLabel(t) || 'Details'}
                  </Link>
                  {mine(t) && t.status === 'pending' ? (
                    <button type="button" className="btn btn-sm btn-primary" disabled={busyId === t.id} onClick={() => handleStatusUpdate(t.id, 'in_progress')}>
                      Start task
                    </button>
                  ) : mine(t) && (t.status === 'in_progress' || t.status === 'overdue') && myState(t) !== 'submitted' ? (
                    <button type="button" className="btn btn-sm btn-ok" disabled={busyId === t.id} onClick={() => handleSubmitForReview(t.id)}>
                      <Icon name="check" size={14} /> Submit for review
                    </button>
                  ) : (
                    <Link href={`/tasks/${t.id}`} className="btn btn-sm btn-ghost">View</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === 'board' ? (
        <KanbanBoard tasks={tasks} onStatusChange={handleStatusUpdate} canEdit={canManageTasks} />
      ) : (
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="thead" style={{ gridTemplateColumns: 'minmax(0,2.2fr) 120px 110px 140px minmax(0,1.4fr) 44px' }}>
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Deadline</span>
              <span>Assignee</span>
              <span />
            </div>
            {tasks.map((t) => (
              <div key={t.id} className="trow" style={{ gridTemplateColumns: 'minmax(0,2.2fr) 120px 110px 140px minmax(0,1.4fr) 44px' }}>
                <div className="col" style={{ gap: 2 }}>
                  <Link href={`/tasks/${t.id}`} className="trunc" style={{ fontWeight: 500 }}>{t.title}</Link>
                  <span className="t-xs muted"><TypeTag type={t.media_type} /></span>
                </div>
                <div><Chip status={t.status} /></div>
                <div><Pri level={t.priority} /></div>
                <div className="t-sm" style={{ color: isLate(t) ? 'var(--s-over-fg)' : undefined }}>{fmtDate(t.deadline)}</div>
                <div>
                  {needsAssignment(t) ? (
                    <select className="input sel" disabled={busyId === t.id} defaultValue="" onChange={(e) => handleAssign(t.id, e.target.value)}>
                      <option value="" disabled>Assign to…</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="row" style={{ gap: 8 }}>
                      <Avatar name={t.assignee?.name} size="sm" />
                      <span className="t-sm trunc">{assigneeLabel(t) || '—'}</span>
                    </span>
                  )}
                </div>
                <div>
                  <button type="button" className="icon-btn" style={{ width: 32, height: 32, boxShadow: 'none' }} aria-label="Delete task" disabled={busyId === t.id} onClick={() => setToDelete(t)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="sp" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <Icon name="left" size={14} /> Previous
              </button>
              <span className="t-sm muted">Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <Icon name="right" size={14} />
              </button>
            </div>
          ) : null}
        </>
      )}

      {canManageTasks && view === 'board' && tasks.some(needsAssignment) ? (
        <p className="hint" style={{ marginTop: 12 }}>Unassigned tasks can be assigned from the List view or the task page.</p>
      ) : null}

      {toDelete ? (
        <Modal
          title="Delete task?"
          onClose={() => setToDelete(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setToDelete(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p className="muted">“{toDelete.title}” will be permanently removed.</p>
        </Modal>
      ) : null}
    </>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <TasksView />
    </Suspense>
  );
}
