'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  skills: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
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

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User approved successfully');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to approve user');
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User deactivated');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      coordinator: 'bg-purple-100 text-purple-800',
      student_head: 'bg-blue-100 text-blue-800',
      requestor: 'bg-green-100 text-green-800',
      team_member: 'bg-orange-100 text-orange-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'pending') return !u.is_approved;
    if (filter === 'active') return u.is_active && u.is_approved;
    if (filter === 'coordinators') return u.role === 'coordinator';
    if (filter === 'student_heads') return u.role === 'student_head';
    if (filter === 'team_members') return u.role === 'team_member';
    if (filter === 'requestors') return u.role === 'requestor';
    return true;
  });

  const pendingCount = users.filter((u) => !u.is_approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Status Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">User Management</h1>
          {pendingCount > 0 && (
            <p className="text-sm font-semibold text-yellow-accent mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-accent animate-ping" />
              {pendingCount} user{pendingCount > 1 ? 's' : ''} pending approval
            </p>
          )}
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-card border border-border hover:border-yellow-outline/60 hover:shadow-lg hover:shadow-yellow-outline/5 rounded-2xl p-6 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Total Users</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300 border border-primary/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className={`bg-card border ${pendingCount > 0 ? 'border-yellow-outline shadow-md shadow-yellow-outline/5 animate-pulse-slow' : 'border-border'} hover:border-yellow-accent/40 rounded-2xl p-6 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Pending Approval</p>
              <p className={`text-4xl font-extrabold mt-3 tracking-tight ${pendingCount > 0 ? 'text-yellow-accent' : 'text-foreground'}`}>{pendingCount}</p>
            </div>
            <div className={`w-12 h-12 ${pendingCount > 0 ? 'bg-amber-500/10 text-yellow-accent border-yellow-outline' : 'bg-muted text-muted-foreground border-transparent'} border rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>

        {/* Coordinators & Student Heads */}
        <div className="bg-card border border-border hover:border-yellow-outline/60 hover:shadow-lg hover:shadow-yellow-outline/5 rounded-2xl p-6 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Leads & Coords</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">
                {users.filter(u => u.role === 'coordinator' || u.role === 'student_head').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300 border border-purple-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-card border border-border hover:border-yellow-outline/60 hover:shadow-lg hover:shadow-yellow-outline/5 rounded-2xl p-6 hover:scale-[1.01] transition duration-300 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Active Members</p>
              <p className="text-4xl font-extrabold text-foreground mt-3 tracking-tight">
                {users.filter(u => u.is_active && u.is_approved && (u.role === 'team_member' || u.role === 'requestor')).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300 border border-emerald-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Filter Users</h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'pending'
                ? 'bg-yellow-accent text-white border-yellow-accent shadow-md shadow-yellow-accent/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'active'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            Active Approved
          </button>
          <button
            onClick={() => setFilter('coordinators')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'coordinators'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            Coordinators
          </button>
          <button
            onClick={() => setFilter('student_heads')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'student_heads'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            Student Heads
          </button>
          <button
            onClick={() => setFilter('team_members')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'team_members'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            Team Members
          </button>
          <button
            onClick={() => setFilter('requestors')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition duration-200 border ${
              filter === 'requestors'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            Requestors
          </button>
        </div>
      </div>

      {/* Users Table Bento Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground">User Directory</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPending = !u.is_approved;
                  const isActive = u.is_active;
                  
                  let rowClass = 'hover:bg-muted/40 border-l-4 border-l-transparent';
                  if (isPending) {
                    rowClass = 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-yellow-accent/70';
                  } else if (isActive) {
                    rowClass = 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary';
                  }

                  return (
                    <tr key={u.id} className={`transition duration-150 ${rowClass}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 ${isPending ? 'from-amber-400 to-yellow-500' : 'from-blue-500 to-indigo-600'} bg-gradient-to-br rounded-full flex items-center justify-center shadow-inner`}>
                            <span className="text-white font-semibold text-sm">{u.name?.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="ml-4">
                            <p className="font-semibold text-foreground text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadge(u.role)}`}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                            Pending Approval
                          </span>
                        ) : isActive ? (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {isPending && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:border-yellow-outline/50 border border-transparent px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm hover:shadow transition"
                            >
                              Approve
                            </button>
                          )}
                          {isActive && u.id !== user?.user_id && (
                            <button
                              onClick={() => handleDeactivate(u.id)}
                              className="bg-muted text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-border transition"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
