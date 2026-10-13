'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import TaskComments from '@/components/Tasks/TaskComments';
import TaskActivity from '@/components/Tasks/TaskActivity';
import TaskLinks from '@/components/Tasks/TaskLinks';
import { Avatar, Chip, Icon, Modal, PageHead, Pri, Spinner, TypeTag, fmtDate } from '@/components/ui/kit';
import type { Task } from '@/types/database';

interface Member {
  id: string;
  name: string;
  email: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, canManageTasks } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskId = params.id as string;
  const currentUserId = user?.user_id || user?.id || '';

  const fetchTask = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setTask(data.task);
      } else {
        toast.error('Task not found');
        router.push('/tasks');
      }
    } catch {
      toast.error('Failed to fetch task');
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    if (!canManageTasks) return;
    fetch('/api/users/team-members')
      .then((r) => r.json())
      .then((d) => d.success && setTeamMembers(d.teamMembers))
      .catch(() => console.error('Failed to fetch team members'));
  }, [canManageTasks]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status updated');
        fetchTask();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (assignedTo: string) => {
    if (!assignedTo) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Task assigned');
        fetchTask();
      } else {
        toast.error(data.error || 'Failed to assign task');
      }
    } catch {
      toast.error('Failed to assign task');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('Task deleted');
        router.push('/tasks');
      } else {
        toast.error(data.error || 'Failed to delete task');
      }
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: 256 }}>
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="card card-p col" style={{ alignItems: 'center', gap: 8 }}>
        <p className="muted">Task not found</p>
        <Link href="/tasks" className="lnk">Back to tasks</Link>
      </div>
    );
  }

  // Approved requests are parked on the approver until someone is picked: treat as unassigned
  const unassigned = canManageTasks && !!task.request_id && task.assigned_to === task.created_by && task.status === 'pending';
  const isMine = !!user && task.assigned_to === currentUserId && !unassigned;
  const assignee = teamMembers.find((m) => m.id === task.assigned_to);
  const assigneeName = assignee?.name || (task.assigned_to === currentUserId ? user?.name : undefined);
  const late = task.status === 'overdue';

  const primaryAction =
    isMine && task.status === 'pending' ? (
      <button type="button" className="btn btn-primary" disabled={updating} onClick={() => handleStatusUpdate('in_progress')}>
        Start task
      </button>
    ) : isMine && (task.status === 'in_progress' || task.status === 'overdue') ? (
      <button type="button" className="btn btn-ok" disabled={updating} onClick={() => handleStatusUpdate('completed')}>
        <Icon name="check" size={16} /> Mark complete
      </button>
    ) : null;

  return (
    <>
      <div className="col" style={{ gap: 8 }}>
        <Link href="/tasks" className="row t-sm muted" style={{ gap: 6 }}>
          <Icon name="left" size={16} /> Back to tasks
        </Link>
        <PageHead
          title={
            <>
              {task.title}
              <span className="row wrap" style={{ gap: 8, marginTop: 8, fontSize: 14, fontWeight: 400 }}>
                <Chip status={task.status} />
                <Pri level={task.priority} />
                <TypeTag type={task.media_type} />
              </span>
            </>
          }
          actions={
            <>
              {primaryAction}
              {canManageTasks ? (
                <button type="button" className="btn btn-danger" disabled={updating} onClick={() => setConfirmDelete(true)}>
                  <Icon name="trash" size={16} /> Delete
                </button>
              ) : null}
            </>
          }
        />
      </div>

      <div className="split">
        <div className="col" style={{ gap: 16, minWidth: 0 }}>
          <div className="card card-p col" style={{ gap: 14 }}>
            <h2 className="t-h2">Description</h2>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{task.description || 'No description provided.'}</p>
            {task.notes ? (
              <>
                <hr className="hr" />
                <div className="col" style={{ gap: 4 }}>
                  <span className="eyebrow">Notes</span>
                  <p className="t-sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{task.notes}</p>
                </div>
              </>
            ) : null}
          </div>

          <TaskLinks taskId={taskId} currentUserId={currentUserId} canManage={canManageTasks} />
          <TaskComments taskId={taskId} currentUserId={currentUserId} canManage={canManageTasks} />
        </div>

        <div className="col" style={{ gap: 16, minWidth: 0 }}>
          <div className="card card-p col" style={{ gap: 4 }}>
            <h2 className="t-h2" style={{ marginBottom: 6 }}>Details</h2>
            <div className="kv"><span>Status</span><Chip status={task.status} /></div>
            <div className="kv"><span>Priority</span><Pri level={task.priority} /></div>
            <div className="kv">
              <span>Deadline</span>
              <b style={{ fontWeight: 500, color: late ? 'var(--s-over-fg)' : undefined }}>{fmtDate(task.deadline)}</b>
            </div>
            <div className="kv"><span>Created</span><span>{fmtDate(task.created_at)}</span></div>
            {task.completion_date ? <div className="kv"><span>Completed</span><span>{fmtDate(task.completion_date)}</span></div> : null}
          </div>

          <div className="card card-p col" style={{ gap: 12 }}>
            <h2 className="t-h2">Assigned to</h2>
            {unassigned ? (
              <p className="t-sm muted">Not assigned yet.</p>
            ) : (
              <div className="row" style={{ gap: 12 }}>
                <Avatar name={assigneeName} size="lg" />
                <b className="trunc" style={{ fontWeight: 500 }}>{assigneeName || 'Team member'}</b>
              </div>
            )}
            {canManageTasks ? (
              <select className="input sel" value="" disabled={updating} onChange={(e) => handleAssign(e.target.value)}>
                <option value="" disabled>{unassigned ? 'Assign to…' : 'Reassign to…'}</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : null}
          </div>

          {task.request_id ? (
            <div className="card card-p col" style={{ gap: 10 }}>
              <h2 className="t-h2">Linked request</h2>
              <Link
                href={`/requests?highlight=${task.request_id}`}
                className="row"
                style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 12, gap: 10, background: 'var(--surface-2)' }}
              >
                <Icon name="inbox" size={18} />
                <b className="grow" style={{ fontWeight: 500 }}>View original request</b>
                <Icon name="right" size={16} />
              </Link>
            </div>
          ) : null}

          <TaskActivity taskId={taskId} />
        </div>
      </div>

      {confirmDelete ? (
        <Modal
          title="Delete task?"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p className="muted">“{task.title}” will be permanently removed.</p>
        </Modal>
      ) : null}
    </>
  );
}
