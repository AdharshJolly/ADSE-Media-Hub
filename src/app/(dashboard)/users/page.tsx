'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchJson, peek, type Api } from '@/lib/client-cache';
import toast from 'react-hot-toast';
import { Avatar, Chip, Empty, Field, Icon, Modal, PageHead, ROLE_LABEL, fmtDate } from '@/components/ui/kit';
import type { IconName } from '@/components/ui/kit';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  skills: string;
  is_active: boolean;
  is_approved: boolean;
  must_change_password?: boolean;
  created_at: string;
}

const COLS = 'minmax(0,2.4fr) minmax(0,1.1fr) minmax(0,1.4fr) minmax(0,1fr) 150px';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Awaiting login' },
  { key: 'active', label: 'Active' },
  { key: 'coordinators', label: 'Coordinators' },
  { key: 'student_heads', label: 'Student heads' },
  { key: 'team_members', label: 'Team members' },
  { key: 'requestors', label: 'Requestors' },
];

export default function UsersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <UsersInner />
    </Suspense>
  );
}

function UsersInner() {
  const { user, isCoordinator } = useAuth();
  const q = (useSearchParams().get('q') || '').trim();
  const [users, setUsers] = useState<User[]>(() => peek('/api/users')?.users ?? []);
  const [loading, setLoading] = useState(() => !peek('/api/users'));
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'team_member' });
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [renameUser, setRenameUser] = useState<User | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState<User | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data: Api = await fetchJson('/api/users', { cache: 'no-store' });
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User created. A temporary password was emailed to them.');
        setShowAdd(false);
        setNewUser({ name: '', email: '', role: 'team_member' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmUser) return;
    setDeactivating(true);
    try {
      const response = await fetch(`/api/users/${confirmUser.id}/deactivate`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('User deactivated');
        setConfirmUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to deactivate user');
      }
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setDeactivating(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameUser) return;
    setRenaming(true);
    try {
      const response = await fetch(`/api/users/${renameUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Name updated');
        setRenameUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update name');
      }
    } catch {
      toast.error('Failed to update name');
    } finally {
      setRenaming(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTarget) return;
    setReactivating(true);
    try {
      const response = await fetch(`/api/users/${reactivateTarget.id}/reactivate`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('User reactivated. A temporary password was emailed to them.');
        setReactivateTarget(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to reactivate user');
      }
    } catch {
      toast.error('Failed to reactivate user');
    } finally {
      setReactivating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('User deleted');
        setDeleteTarget(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
        setDeleteTarget(null);
      }
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (q && !`${u.name} ${u.email} ${u.skills}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'pending') return !!u.must_change_password;
    if (filter === 'active') return u.is_active && u.is_approved;
    if (filter === 'coordinators') return u.role === 'coordinator';
    if (filter === 'student_heads') return u.role === 'student_head';
    if (filter === 'team_members') return u.role === 'team_member';
    if (filter === 'requestors') return u.role === 'requestor';
    return true;
  });

  const pendingCount = users.filter((u) => u.must_change_password).length;
  const leads = users.filter((u) => u.role === 'coordinator' || u.role === 'student_head').length;
  const activeMembers = users.filter(
    (u) => u.is_active && u.is_approved && (u.role === 'team_member' || u.role === 'requestor')
  ).length;

  const stats: Array<{ label: string; value: number; icon: IconName }> = [
    { label: 'Total users', value: users.length, icon: 'users' },
    { label: 'Awaiting first login', value: pendingCount, icon: 'clock' },
    { label: 'Leads & coordinators', value: leads, icon: 'shield' },
    { label: 'Active members', value: activeMembers, icon: 'check' },
  ];

  return (
    <>
      <PageHead
        title="User management"
        sub={
          q ? (
            <>
              Showing people matching “{q}”. <Link href="/users" className="lnk">Clear</Link>
            </>
          ) : (
            'Add people and control who can sign in.'
          )
        }
        actions={
          isCoordinator ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Icon name="userplus" size={16} /> Add user
            </button>
          ) : null
        }
      />

      <div className="grid g4">
        {loading
          ? [0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)
          : stats.map((s) => (
              <div key={s.label} className="card stat">
                <div className="row">
                  <span className="ico"><Icon name={s.icon} size={18} /></span>
                  <small className="grow">{s.label}</small>
                </div>
                <div className="t-num">{s.value}</div>
              </div>
            ))}
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <h2 className="t-h2 grow">User directory</h2>
          <select
            className="input sel"
            style={{ width: 'auto', minWidth: 180 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter users"
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="thead" style={{ gridTemplateColumns: COLS }}>
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Joined</span>
              <span>Actions</span>
            </div>
            {filteredUsers.length === 0 ? (
              <Empty icon="users" title="No users found" text="Try another filter." />
            ) : (
              filteredUsers.map((u) => {
                const status = !u.is_active ? 'inactive' : u.must_change_password ? 'pending' : 'active';
                const label = !u.is_active ? 'Deactivated' : u.must_change_password ? 'Awaiting login' : 'Active';
                const isSelf = u.id === user?.user_id || u.id === user?.id;
                return (
                  <div key={u.id} className="trow" style={{ gridTemplateColumns: COLS }}>
                    <div className="m-full" style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 12, minWidth: 0 }}>
                        <Avatar name={u.name} />
                        <div className="col" style={{ minWidth: 0 }}>
                          <b className="trunc" style={{ fontWeight: 500 }}>{u.name}</b>
                          <span className="t-xs muted trunc">{u.email}</span>
                        </div>
                      </div>
                    </div>
                    <div><span className="tag">{ROLE_LABEL[u.role] || u.role}</span></div>
                    <div><Chip status={status} label={label} /></div>
                    <div><span className="t-sm muted">{u.created_at ? fmtDate(u.created_at, false) : 'N/A'}</span></div>
                    <div className="row" style={{ gap: 2 }}>
                      {isCoordinator ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          title="Edit name"
                          aria-label={`Edit name of ${u.name}`}
                          onClick={() => { setRenameUser(u); setRenameValue(u.name); }}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                      ) : null}
                      {isCoordinator && !isSelf && u.is_active ? (
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmUser(u)}>
                          Deactivate
                        </button>
                      ) : null}
                      {isCoordinator && !u.is_active ? (
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setReactivateTarget(u)}>
                          Reactivate
                        </button>
                      ) : null}
                      {isCoordinator && !isSelf ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          title="Delete user"
                          aria-label={`Delete ${u.name}`}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showAdd ? (
        <Modal
          title="Add user"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" form="add-user-form" className="btn btn-primary" disabled={adding}>
                <Icon name="send" size={16} /> {adding ? 'Creating…' : 'Create & email'}
              </button>
            </>
          }
        >
          <form id="add-user-form" onSubmit={handleCreate} className="col" style={{ gap: 14 }}>
            <p className="t-sm muted">A random temporary password will be emailed to them.</p>
            <Field label="Name">
              <input className="input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} maxLength={100} required />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
            </Field>
            <Field label="Role">
              <select className="input sel" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="team_member">Team member</option>
                <option value="requestor">Requestor</option>
                <option value="student_head">Student head</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </Field>
          </form>
        </Modal>
      ) : null}

      {confirmUser ? (
        <Modal
          title="Deactivate user"
          onClose={() => setConfirmUser(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirmUser(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeactivate} disabled={deactivating}>
                {deactivating ? 'Deactivating…' : 'Deactivate'}
              </button>
            </>
          }
        >
          <p className="t-sm">
            <b style={{ fontWeight: 500 }}>{confirmUser.name}</b> will no longer be able to sign in. Continue?
          </p>
        </Modal>
      ) : null}
      {renameUser ? (
        <Modal
          title="Edit name"
          onClose={() => setRenameUser(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRenameUser(null)}>Cancel</button>
              <button type="submit" form="rename-user-form" className="btn btn-primary" disabled={renaming || !renameValue.trim()}>
                {renaming ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="rename-user-form" onSubmit={handleRename} className="col" style={{ gap: 14 }}>
            <Field label="Name">
              <input className="input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={100} required autoFocus />
            </Field>
          </form>
        </Modal>
      ) : null}

      {reactivateTarget ? (
        <Modal
          title="Reactivate user"
          onClose={() => setReactivateTarget(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setReactivateTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleReactivate} disabled={reactivating}>
                <Icon name="send" size={16} /> {reactivating ? 'Reactivating…' : 'Reactivate & email'}
              </button>
            </>
          }
        >
          <p className="t-sm">
            <b style={{ fontWeight: 500 }}>{reactivateTarget.name}</b> will get a new temporary password by email and must choose their own password when they sign in.
          </p>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal
          title="Delete user"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </>
          }
        >
          <p className="t-sm">
            <b style={{ fontWeight: 500 }}>{deleteTarget.name}</b> will be removed for good. This cannot be undone. People with requests or tasks on record can only be deactivated.
          </p>
        </Modal>
      ) : null}
    </>
  );
}
